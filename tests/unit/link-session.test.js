import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLinkSession, deriveSid, verifyAgent, isValidSid, toBase64Url, MAX_AGE_MS, SKEW_MS,
} from '../../web/js/core/link-session.js';

// Vectors computed once with Node's crypto:
// sha256("lct1|<token>|<created>") as base64url, first 22 characters.
const V1 = { token: 'A'.repeat(43), created: 1767225600000, sid: 'OAt2jsCx_hA_81vUDXyTse' };
const V2 = { token: 'Zz09_-'.repeat(7) + 'q', created: 1767225600000, sid: 'XBLp2mIZcOTNRuYfY6cIIL' };

test('constants: links live at most 4 hours; 60 s clock skew allowed', () => {
  assert.equal(MAX_AGE_MS, 4 * 60 * 60 * 1000);
  assert.equal(SKEW_MS, 60_000);
});

test('base64url has no padding or +/ characters', () => {
  assert.equal(toBase64Url(new Uint8Array([251, 255, 191])), '-_-_');
  assert.equal(toBase64Url(new Uint8Array([1])), 'AQ');
});

test('deriveSid matches the fixed vectors', async () => {
  assert.equal(await deriveSid(V1.token, V1.created), V1.sid);
  assert.equal(await deriveSid(V2.token, V2.created), V2.sid);
});

test('createLinkSession makes a 43-char token, a 22-char sid and the customer URL', async () => {
  const s = await createLinkSession({
    origin: 'https://lct.example', now: V1.created, random: (n) => new Uint8Array(n),
  });
  assert.equal(s.token, V1.token);               // 32 zero bytes → 43 'A'
  assert.equal(s.created, V1.created);
  assert.equal(s.sid, V1.sid);
  assert.equal(s.url, `https://lct.example/v.html#${V1.sid}`);

  const real = await createLinkSession({ origin: 'http://localhost:8787' });
  assert.match(real.token, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(isValidSid(real.sid));
});

test('verifyAgent: ok within 4 h, too-old after, future beyond skew, mismatch otherwise', async () => {
  const base = { sid: V1.sid, token: V1.token, created: V1.created };
  assert.deepEqual(await verifyAgent({ ...base, now: V1.created + 1000 }), { ok: true });
  assert.deepEqual(await verifyAgent({ ...base, now: V1.created + MAX_AGE_MS }), { ok: true });
  assert.deepEqual(await verifyAgent({ ...base, now: V1.created + MAX_AGE_MS + 1 }), { ok: false, reason: 'too-old' });
  assert.deepEqual(await verifyAgent({ ...base, now: V1.created - SKEW_MS - 1 }), { ok: false, reason: 'future' });
  assert.deepEqual(await verifyAgent({ ...base, token: V2.token, now: V1.created }), { ok: false, reason: 'mismatch' });
  assert.deepEqual(await verifyAgent({ ...base, token: 'short', now: V1.created }), { ok: false, reason: 'mismatch' });
});

test('isValidSid accepts exactly 22 base64url characters', () => {
  assert.equal(isValidSid(V1.sid), true);
  for (const bad of ['', V1.sid.slice(1), `${V1.sid}x`, 'OAt2jsCx+hA/81vUDXyTse', null, 42]) {
    assert.equal(isValidSid(bad), false, String(bad));
  }
});
