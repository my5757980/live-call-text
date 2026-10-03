import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCaption, buildEnd, buildStatus, parseAgentFrame, parseViewerFrame, splitCaption,
  MAX_FRAME_BYTES, MAX_TEXT, LANGS,
} from '../../web/js/core/protocol.js';

// Mirrors specs/001-live-call-text/contracts/relay-messages.schema.json.

test('limits and languages', () => {
  assert.equal(MAX_FRAME_BYTES, 2048);
  assert.equal(MAX_TEXT, 500);
  assert.deepEqual([...LANGS].sort(), ['en-US', 'ur-PK']);
});

test('built frames parse back', () => {
  const caption = buildCaption({ id: 'call-1:agent:1:0', text: 'السلام علیکم', final: false, lang: 'ur-PK' });
  assert.deepEqual(parseAgentFrame(caption), {
    ok: true, msg: { t: 'caption', id: 'call-1:agent:1:0', text: 'السلام علیکم', final: false, lang: 'ur-PK' },
  });
  assert.deepEqual(parseAgentFrame(buildEnd()), { ok: true, msg: { t: 'end' } });
  assert.deepEqual(parseViewerFrame(buildStatus('ended')), { ok: true, msg: { t: 'status', state: 'ended' } });
  assert.equal(parseViewerFrame(caption).ok, true);
});

test('agent frames that break the contract are rejected', () => {
  const good = { t: 'caption', id: 'a:1', text: 'hi', final: true, lang: 'en-US' };
  const bad = [
    'not json',
    JSON.stringify([good]),
    JSON.stringify({ ...good, text: '' }),
    JSON.stringify({ ...good, text: 'x'.repeat(501) }),
    JSON.stringify({ ...good, lang: 'fr-FR' }),
    JSON.stringify({ ...good, extra: 1 }),
    JSON.stringify({ ...good, id: 'bad id!' }),
    JSON.stringify({ ...good, final: 'yes' }),
    JSON.stringify({ t: 'status', state: 'live' }),   // only the relay sends status
    JSON.stringify({ t: 'end', extra: true }),
    JSON.stringify({ t: 'nope' }),
    JSON.stringify({ ...good, text: 'ب'.repeat(400) }) + ' '.repeat(2048),
  ];
  for (const frame of bad) assert.equal(parseAgentFrame(frame).ok, false, frame.slice(0, 60));
  assert.equal(parseAgentFrame(new ArrayBuffer(4)).ok, false);
});

test('frames over 2048 bytes are rejected even when valid JSON', () => {
  const big = JSON.stringify({ t: 'caption', id: 'a', text: 'ب'.repeat(500), final: true, lang: 'ur-PK' });
  assert.ok(new TextEncoder().encode(big).length > 1000);
  assert.equal(parseAgentFrame(big).ok, true);   // 500 Urdu letters still fit
  assert.equal(parseAgentFrame(big + ' '.repeat(2048)).ok, false);
});

test('viewer frames: only caption or a known status', () => {
  assert.equal(parseViewerFrame(JSON.stringify({ t: 'status', state: 'bogus' })).ok, false);
  assert.equal(parseViewerFrame(JSON.stringify({ t: 'end' })).ok, false);
  for (const state of ['live', 'paused', 'ended', 'expired', 'invalid']) {
    assert.equal(parseViewerFrame(buildStatus(state)).ok, true, state);
  }
});

test('splitCaption splits long finals and trims long interims', () => {
  const long = 'a'.repeat(1200);
  const parts = splitCaption({ id: 'c:agent:1:0', text: long, final: true, lang: 'en-US' });
  assert.deepEqual(parts.map((p) => [p.id, p.text.length, p.final]),
    [['c:agent:1:0', 500, true], ['c:agent:1:0:p1', 500, true], ['c:agent:1:0:p2', 200, true]]);
  const interim = splitCaption({ id: 'c:agent:1:0', text: `${'x'.repeat(100)}${'y'.repeat(500)}`, final: false, lang: 'en-US' });
  assert.deepEqual(interim.map((p) => [p.id, p.text]), [['c:agent:1:0', 'y'.repeat(500)]]);
  assert.deepEqual(splitCaption({ id: 'c', text: '  ', final: true, lang: 'en-US' }), []);
  for (const p of parts) assert.equal(parseAgentFrame(buildCaption(p)).ok, true);
});
