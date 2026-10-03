// Relay message format, protocol "lct1" (contracts/relay-messages.schema.json).
// Shared by the agent page, the customer page and the relay.

export const LANGS = Object.freeze(['ur-PK', 'en-US']);
export const MAX_FRAME_BYTES = 2048;
export const MAX_TEXT = 500;
export const STATUS_STATES = Object.freeze(['live', 'paused', 'ended', 'expired', 'invalid']);

const ID_RE = /^[A-Za-z0-9:_-]{1,80}$/;
const CAPTION_KEYS = ['final', 'id', 'lang', 't', 'text'];

export const buildCaption = ({ id, text, final, lang }) =>
  JSON.stringify({ t: 'caption', id, text, final: Boolean(final), lang });
export const buildEnd = () => JSON.stringify({ t: 'end' });
export const buildStatus = (state) => JSON.stringify({ t: 'status', state });

const sameKeys = (obj, keys) => {
  const own = Object.keys(obj).sort();
  return own.length === keys.length && own.every((k, i) => k === keys[i]);
};

function parseObject(frame) {
  if (typeof frame !== 'string') return { ok: false, reason: 'not-text' };
  if (new TextEncoder().encode(frame).length > MAX_FRAME_BYTES) return { ok: false, reason: 'too-big' };
  let msg;
  try { msg = JSON.parse(frame); } catch { return { ok: false, reason: 'bad-json' }; }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return { ok: false, reason: 'bad-shape' };
  return { ok: true, msg };
}

const isCaption = (m) => m.t === 'caption'
  && sameKeys(m, CAPTION_KEYS)
  && typeof m.id === 'string' && ID_RE.test(m.id)
  && typeof m.text === 'string' && m.text.length >= 1 && m.text.length <= MAX_TEXT
  && typeof m.final === 'boolean'
  && LANGS.includes(m.lang);

const isEnd = (m) => m.t === 'end' && sameKeys(m, ['t']);
const isStatus = (m) => m.t === 'status' && sameKeys(m, ['state', 't']) && STATUS_STATES.includes(m.state);

export function parseAgentFrame(frame) {
  const p = parseObject(frame);
  if (!p.ok) return p;
  if (isCaption(p.msg) || isEnd(p.msg)) return { ok: true, msg: p.msg };
  return { ok: false, reason: 'invalid' };
}

export function parseViewerFrame(frame) {
  const p = parseObject(frame);
  if (!p.ok) return p;
  if (isCaption(p.msg) || isStatus(p.msg)) return { ok: true, msg: p.msg };
  return { ok: false, reason: 'invalid' };
}

// Fits a caption into 500-character pieces: long finals are split into parts with ids
// "<id>", "<id>:p1", ...; long in-progress text keeps only its newest 500 characters.
export function splitCaption({ id, text, final, lang }) {
  const value = String(text ?? '').trim();
  if (!value) return [];
  if (!final) return [{ id, text: value.length > MAX_TEXT ? value.slice(-MAX_TEXT) : value, final: false, lang }];
  const parts = [];
  for (let i = 0, n = 0; i < value.length; i += MAX_TEXT, n++) {
    parts.push({ id: n === 0 ? id : `${id}:p${n}`, text: value.slice(i, i + MAX_TEXT), final: true, lang });
  }
  return parts;
}
