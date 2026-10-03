// Agent side of the customer link: sends the agent's words to the relay
// (contracts/relay-protocol.md). The link only counts as live once the relay says so.
import { buildCaption, buildEnd, splitCaption } from '../core/protocol.js';
import { createThrottle } from '../core/throttle.js';

const BACKOFF_MS = [1000, 2000, 4000, 5000];
const GIVE_UP_AFTER_MS = 60_000;
const PING_MS = 30_000;
const TICK_MS = 250;
const MAX_QUEUED_FINALS = 20;

export function createRelayClient({ origin, session, onState, WebSocketImpl = WebSocket }) {
  const url = `${origin.replace(/^http/, 'ws')}/ws?role=agent&sid=${session.sid}`;
  const protocols = ['lct1', `auth.${session.token}.${session.created}`];
  const throttle = createThrottle({ intervalMs: 1000 });
  const queuedFinals = [];
  let ws = null;
  let state = null;
  let everLive = false;
  let ended = false;
  let attempt = 0;
  let downSince = null;
  let retryTimer = null;
  let pingTimer = null;

  const set = (next) => {
    if (state !== next) {
      state = next;
      onState?.(next);
    }
  };

  const send = (frame) => {
    if (ws?.readyState === 1) {
      ws.send(frame);
      return true;
    }
    return false;
  };

  const tickTimer = setInterval(() => {
    for (const c of throttle.tick()) send(buildCaption(c));
  }, TICK_MS);

  function connect() {
    if (ended) return;
    // First try: connecting. After a drop: reconnecting. A link that never reached the
    // relay stays "unavailable" while it keeps retrying, so the warning doesn't flicker.
    if (state === null) set('connecting');
    else if (everLive) set('reconnecting');
    const socket = new WebSocketImpl(url, protocols);
    ws = socket;

    socket.onmessage = (e) => {
      if (e.data === 'pong') return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg?.t !== 'status') return;
      if (msg.state === 'live') {
        everLive = true;
        attempt = 0;
        downSince = null;
        set('live');
        while (queuedFinals.length) send(queuedFinals.shift());
      } else if (msg.state === 'expired' || msg.state === 'ended') {
        finish();
      }
    };
    socket.onopen = () => {
      clearInterval(pingTimer);
      pingTimer = setInterval(() => send('ping'), PING_MS);
    };
    socket.onclose = (e) => {
      clearInterval(pingTimer);
      if (ws !== socket || ended) return;
      if (e.code === 4000 || e.code === 4001) {
        finish();
        return;
      }
      downSince ??= Date.now();
      if (Date.now() - downSince >= GIVE_UP_AFTER_MS) {
        set('unavailable');
        return;
      }
      // Never reached the relay: tell the agent now, but keep trying in the background.
      set(everLive ? 'reconnecting' : 'unavailable');
      retryTimer = setTimeout(connect, BACKOFF_MS[Math.min(attempt++, BACKOFF_MS.length - 1)]);
    };
  }

  function finish() {
    ended = true;
    clearTimeout(retryTimer);
    clearInterval(pingTimer);
    clearInterval(tickTimer);
    set('ended');
  }

  connect();

  return {
    get state() { return state; },

    // Only the agent's own lines are ever sent (FR-026).
    sendCaption(caption) {
      if (ended) return;
      for (const part of splitCaption(caption)) {
        for (const c of throttle.offer(part)) {
          const frame = buildCaption(c);
          if (!send(frame) && c.final && queuedFinals.length < MAX_QUEUED_FINALS) queuedFinals.push(frame);
        }
      }
    },

    // Call ended (Stop, sharing ended, or page closing): tell the relay, then close.
    end() {
      if (ended) return;
      send(buildEnd());
      try { ws?.close(1000, 'ended'); } catch { /* already closed */ }
      finish();
    },
  };
}
