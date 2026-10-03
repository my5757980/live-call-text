// Customer-link sessions (research.md R7). Shared by the agent page and the relay.
// The session id is derived from a secret token, so the relay can check the agent
// without storing anything (Constitution V).

export const MAX_AGE_MS = 4 * 60 * 60 * 1000;   // links stop working after 4 hours (FR-029)
export const SKEW_MS = 60_000;                   // tolerated clock difference

const SID_RE = /^[A-Za-z0-9_-]{22}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const isValidSid = (sid) => typeof sid === 'string' && SID_RE.test(sid);

export function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function deriveSid(token, created) {
  const data = new TextEncoder().encode(`lct1|${token}|${created}`);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
  return toBase64Url(digest).slice(0, 22);
}

const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export async function createLinkSession({ origin, now = Date.now(), random = randomBytes } = {}) {
  const token = toBase64Url(random(32));
  const created = now;
  const sid = await deriveSid(token, created);
  return { token, created, sid, url: `${origin}/v.html#${sid}` };
}

export async function verifyAgent({ sid, token, created, now = Date.now() }) {
  if (!isValidSid(sid) || typeof token !== 'string' || !TOKEN_RE.test(token) || !Number.isSafeInteger(created)) {
    return { ok: false, reason: 'mismatch' };
  }
  if (created > now + SKEW_MS) return { ok: false, reason: 'future' };
  if (now - created > MAX_AGE_MS) return { ok: false, reason: 'too-old' };
  if ((await deriveSid(token, created)) !== sid) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}
