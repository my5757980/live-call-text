import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MESSAGES, HEADSET_REMINDER, PRIVACY_LINE, VIEWER_LABELS, messageFor, pickMessage,
} from '../../web/js/core/messages.js';

// The UI contract is the source of truth for every text (contracts/ui-contract.md).
const contract = readFileSync(
  new URL('../../specs/001-live-call-text/contracts/ui-contract.md', import.meta.url), 'utf8');

function section(heading) {
  const start = contract.indexOf(heading);
  assert.ok(start >= 0, `contract section missing: ${heading}`);
  const rest = contract.slice(start + heading.length);
  const next = rest.search(/^## /m);
  return next >= 0 ? rest.slice(0, next) : rest;
}

const catalog = [...section('## Message catalog (agent page)')
  .matchAll(/^\| ([A-Z][A-Z_]+) \| [^|]+ \| "(.+)" \|$/gm)]
  .map((m) => ({ code: m[1], text: m[2] }));

const viewerRows = [...section('## Customer page labels (English / Urdu)')
  .matchAll(/^\| ([a-z]+) \| "(.+)" \| "(.+)" \|$/gm)]
  .map((m) => ({ state: m[1], en: m[2], ur: m[3] }));

test('every catalog code in the contract exists with the same text', () => {
  assert.equal(catalog.length, 15);
  for (const { code, text } of catalog) {
    assert.ok(MESSAGES[code], `missing code ${code}`);
    assert.equal(MESSAGES[code].text, text, `text differs for ${code}`);
  }
});

test('no codes exist beyond the contract', () => {
  assert.deepEqual(Object.keys(MESSAGES).sort(), catalog.map((c) => c.code).sort());
});

test('levels follow the code prefix', () => {
  const byPrefix = { E: 'error', W: 'warning', I: 'info', H: 'hint' };
  for (const [code, m] of Object.entries(MESSAGES)) {
    assert.equal(m.level, byPrefix[code[0]], `level of ${code}`);
  }
});

test('fixed texts match the contract', () => {
  assert.equal(HEADSET_REMINDER, contract.match(/- Headset reminder: "(.+)"/)[1]);
  assert.equal(PRIVACY_LINE, contract.match(/- Privacy line: "(.+)"/)[1]);
});

test('customer page labels exist in English and Urdu for every state', () => {
  assert.equal(viewerRows.length, 6);
  for (const { state, en, ur } of viewerRows) {
    assert.deepEqual(VIEWER_LABELS[state], { en, ur }, `labels for ${state}`);
  }
});

test('pickMessage shows errors first, then the contract priority order', () => {
  assert.equal(pickMessage([]), null);
  assert.equal(pickMessage(['H_NO_CALL_SOUND']), null);
  assert.equal(pickMessage(['I_LINK_COPIED', 'E_NO_CALL_SOUND_SCREEN']), 'E_NO_CALL_SOUND_SCREEN');
  const order = ['W_NO_INTERNET', 'W_SPEECH_SERVICE', 'W_LINK_UNAVAILABLE', 'W_MIC_BLOCKED',
    'W_MIC_MISSING', 'I_SHARING_STOPPED', 'I_LINK_COPIED', 'I_CHAT_SAVED'];
  const active = [...order].reverse();
  for (const expected of order) {
    assert.equal(pickMessage(active), expected);
    active.splice(active.indexOf(expected), 1);
  }
});

test('unknown codes throw', () => {
  assert.throws(() => messageFor('NOPE'));
  assert.throws(() => pickMessage(['NOPE']));
});
