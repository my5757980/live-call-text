// Customer side of the link: receives the agent's words (contracts/relay-protocol.md).
// States: connecting, waiting, live, paused, ended, invalid (data-model ViewerState).
import { parseViewerFrame } from '../core/protocol.js';

const PAUSED_ENDS_AFTER_MS = 60_000;
const PING_MS = 30_000;
const RETRY_MS = 2000;

export function connectViewer({ origin, sid, onStatus, onCaption, WebSocketImpl = WebSocket }) {
  const url = `${origin.replace(/^http/, 'ws')}/ws?role=viewer&sid=${encodeURIComponent(sid)}`;
  let ws = null;
  let state = 'connecting';
  let hasCaption = false;
  let pausedTimer = null;
  let pingTimer = null;
  let downSince = null;

  const final = () => state === 'ended' || state === 'invalid';
  const set = (next) => {
    if (final() || state === next) return;
    state = next;
    if (next !== 'paused') clearTimeout(pausedTimer);
    if (final()) {
      // Ended means ended: stop listening, so nothing can appear under "Call ended".
      clearInterval(pingTimer);
      try { ws?.close(); } catch { /* already closed */ }
    }
    onStatus?.(next);
  };

  function pause() {
    set('paused');
    clearTimeout(pausedTimer);
    pausedTimer = setTimeout(() => set('ended'), PAUSED_ENDS_AFTER_MS);
  }

  function connect() {
    if (final()) return;
    const socket = new WebSocketImpl(url);
    ws = socket;
    socket.onopen = () => {
      downSince = null;
      clearInterval(pingTimer);
      pingTimer = setInterval(() => { if (socket.readyState === 1) socket.send('ping'); }, PING_MS);
    };
    socket.onmessage = (e) => {
      if (final() || e.data === 'pong') return;
      const parsed = parseViewerFrame(e.data);
      if (!parsed.ok) return;
      const msg = parsed.msg;
      if (msg.t === 'caption') {
        hasCaption = true;
        set('live');
        onCaption?.(msg);
      } else if (msg.state === 'live') {
        set(hasCaption ? 'live' : 'waiting');
      } else if (msg.state === 'paused') {
        pause();
      } else if (msg.state === 'ended' || msg.state === 'expired') {
        set('ended');
      } else if (msg.state === 'invalid') {
        set('invalid');
      }
    };
    socket.onclose = (e) => {
      clearInterval(pingTimer);
      if (final()) return;
      if (e.code === 4404) { set('invalid'); return; }
      if (e.code === 4000 || e.code === 4001 || e.code === 4009) { set('ended'); return; }
      // The phone's connection dropped: wait, then try again (up to 60 s).
      downSince ??= Date.now();
      if (Date.now() - downSince >= PAUSED_ENDS_AFTER_MS) { set('ended'); return; }
      if (state !== 'paused') pause();
      setTimeout(connect, RETRY_MS);
    };
  }

  connect();
  return { get state() { return state; } };
}
