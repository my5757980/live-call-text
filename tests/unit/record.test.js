import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCallRecord } from '../../web/js/core/record.js';

// The call record an agent saves after a call (spec FR-039, User Story 4).
const at = (h, m, s) => new Date(2026, 9, 3, h, m, s).getTime();   // local time
const call = { id: 'call-1', startedAt: at(10, 42, 5) };
const lines = [
  { id: 'a', side: 'customer', text: 'Hello, I want the price', final: true, lang: 'en-US', at: at(10, 42, 10) },
  { id: 'c', side: 'agent', text: 'Hello I want the price', final: true, lang: 'en-US', at: at(10, 42, 11), echo: true },
  { id: 'b', side: 'agent', text: 'السلام علیکم', final: true, lang: 'ur-PK', at: at(10, 42, 15) },
  { id: 'd', side: 'customer', text: 'how many days', final: false, lang: 'en-US', at: at(10, 43, 0) },
];

test('file name carries the call date and start time', () => {
  const r = buildCallRecord({ call, lines, customerLang: 'en-US', agentLang: 'ur-PK', endedAt: at(10, 48, 31) });
  assert.equal(r.filename, 'call-2026-10-03_10-42.txt');
});

test('header has date, times, duration and both languages', () => {
  const { text } = buildCallRecord({ call, lines, customerLang: 'en-US', agentLang: 'ur-PK', endedAt: at(10, 48, 31) });
  for (const expected of [
    'Live Call Text - call record',
    'Date: 2026-10-03',
    'Started: 10:42:05',
    'Ended: 10:48:31',
    'Duration: 6 min 26 s',
    'Customer language: English',
    'Agent language: Urdu',
  ]) assert.ok(text.includes(expected), `missing "${expected}"`);
});

test('lines are in time order with time and speaker; echo is left out; Urdu is kept', () => {
  const { text } = buildCallRecord({ call, lines, customerLang: 'en-US', agentLang: 'ur-PK', endedAt: at(10, 48, 31) });
  const body = text.split('\n').filter((l) => l.startsWith('['));
  assert.deepEqual(body, [
    '[10:42:10] Customer: Hello, I want the price',
    '[10:42:15] Agent: السلام علیکم',
    '[10:43:00] Customer: how many days',
  ]);
});

test('a call that is still running says so', () => {
  const { text } = buildCallRecord({ call, lines, customerLang: 'en-US', agentLang: 'en-US', endedAt: null });
  assert.ok(text.includes('Ended: still running'));
  assert.ok(text.includes('Duration: still running'));
});

test('long calls show hours; an empty chat says so', () => {
  const { text } = buildCallRecord({ call, lines: [], customerLang: 'ur-PK', agentLang: 'ur-PK', endedAt: at(11, 52, 6) });
  assert.ok(text.includes('Duration: 1 h 10 min 1 s'));
  assert.ok(text.includes('(no text)'));
});
