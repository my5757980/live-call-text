// Pure decisions for the relay hub (contracts/relay-protocol.md). Unit-tested in Node;
// relay/src/hub.js applies them to real WebSockets.
import { isValidSid, verifyAgent, MAX_AGE_MS } from '../../web/js/core/link-session.js';
import { parseAgentFrame } from '../../web/js/core/protocol.js';

export const MAX_VIEWERS = 5;
export const MAX_FRAMES_PER_SEC = 5;
export const MAX_DROPS = 3;

export const CLOSE = Object.freeze({
  NORMAL: 1000,
  ENDED: 4000,
  EXPIRED: 4001,
  BAD_FRAMES: 4008,
  TOO_MANY_VIEWERS: 4009,
  REPLACED: 4010,
  INVALID: 4404,
});

export function parseUpgrade(url) {
  const params = new URL(url).searchParams;
  return { role: params.get('role'), sid: params.get('sid') };
}

const AUTH_RE = /^auth\.([A-Za-z0-9_-]{43})\.(\d{1,16})$/;

// Agents prove the session with the subprotocols "lct1, auth.<token>.<created>".
export async function decideAgentUpgrade({ url, protocols, now }) {
  const { role, sid } = parseUpgrade(url);
  const offered = String(protocols ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (role !== 'agent' || !isValidSid(sid) || !offered.includes('lct1')) return { ok: false, status: 400 };
  const match = offered.map((p) => AUTH_RE.exec(p)).find(Boolean);
  if (!match) return { ok: false, status: 403 };
  const token = match[1];
  const created = Number(match[2]);
  const verdict = await verifyAgent({ sid, token, created, now });
  if (!verdict.ok) return { ok: false, status: 403, reason: verdict.reason };
  return { ok: true, protocol: 'lct1', sid, created };
}

export function decideViewerJoin({ liveAgent, viewerCount }) {
  if (!liveAgent) return { send: 'invalid', close: CLOSE.INVALID };
  if (viewerCount >= MAX_VIEWERS) return { close: CLOSE.TOO_MANY_VIEWERS };
  return { send: 'live' };
}

// One frame from the agent: forward it, drop it, end the call, or close the socket.
export function onAgentFrame({ frame, attachment, now }) {
  const a = { ...attachment };
  if (now - a.created > MAX_AGE_MS) return { attachment: a, expired: true };

  if (now - (a.windowStart ?? 0) >= 1000) {
    a.windowStart = now;
    a.count = 0;
  }
  a.count = (a.count ?? 0) + 1;
  if (a.count > MAX_FRAMES_PER_SEC) return { attachment: a, drop: 'rate' };

  const parsed = parseAgentFrame(frame);
  if (!parsed.ok) {
    a.drops = (a.drops ?? 0) + 1;
    return a.drops >= MAX_DROPS
      ? { attachment: a, close: CLOSE.BAD_FRAMES }
      : { attachment: a, drop: parsed.reason };
  }
  if (parsed.msg.t === 'end') return { attachment: a, end: true };
  return { attachment: a, forward: frame };
}

// What viewers hear when an agent socket closes.
export function onAgentClose({ code, attachment }) {
  if (attachment?.replaced || attachment?.ended) return 'ignore';
  return code === 1000 || code === 1001 ? 'ended' : 'paused';
}
