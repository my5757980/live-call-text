import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTranscript, summarizeResults } from '../../web/js/core/transcript.js';

const r = (callId, side, session, resultIndex, text, final, at, lang = 'en-US') =>
  ({ callId, side, session, resultIndex, text, final, at, lang });

test('startCall creates a section with id and start time', () => {
  const t = createTranscript();
  assert.deepEqual(t.startCall({ id: 'call-1', startedAt: 1000 }), { id: 'call-1', startedAt: 1000 });
  assert.deepEqual(t.getCalls(), [{ id: 'call-1', startedAt: 1000 }]);
});

test('interim then final for the same result leaves exactly one final line', () => {
  const t = createTranscript();
  t.startCall({ id: 'call-1', startedAt: 0 });
  t.applyResult(r('call-1', 'customer', 1, 0, 'hello I', false, 10));
  t.applyResult(r('call-1', 'customer', 1, 0, 'hello I want', false, 20));
  const { line } = t.applyResult(r('call-1', 'customer', 1, 0, 'hello I want the price', true, 30));
  assert.equal(line.final, true);
  const lines = t.getLines('call-1');
  assert.equal(lines.length, 1);
  assert.deepEqual(
    { id: lines[0].id, text: lines[0].text, final: lines[0].final, at: lines[0].at },
    { id: 'call-1:customer:1:0', text: 'hello I want the price', final: true, at: 10 });
});

test('a new session finalizes the dangling in-progress line and keeps its text', () => {
  const t = createTranscript();
  t.startCall({ id: 'call-1', startedAt: 0 });
  t.applyResult(r('call-1', 'customer', 1, 3, 'how many days', false, 10));
  const { changed } = t.applyResult(r('call-1', 'customer', 2, 0, 'to Karachi', false, 20));
  assert.equal(changed.length, 2);
  assert.deepEqual(changed[0], { ...changed[0], id: 'call-1:customer:1:3', final: true, text: 'how many days' });
  const lines = t.getLines('call-1');
  assert.deepEqual(lines.map((l) => [l.text, l.final]), [['how many days', true], ['to Karachi', false]]);
});

test('a new in-progress index on the same side finalizes the old one', () => {
  const t = createTranscript();
  t.startCall({ id: 'c', startedAt: 0 });
  t.applyResult(r('c', 'agent', 1, 0, 'one', false, 1));
  t.applyResult(r('c', 'agent', 1, 1, 'two', false, 2));
  assert.deepEqual(t.getLines('c').map((l) => [l.text, l.final]), [['one', true], ['two', false]]);
});

test('empty text is ignored', () => {
  const t = createTranscript();
  t.startCall({ id: 'c', startedAt: 0 });
  assert.deepEqual(t.applyResult(r('c', 'customer', 1, 0, '   ', false, 1)), { line: null, changed: [] });
  assert.equal(t.getLines('c').length, 0);
});

test('customer and agent lines interleave by time; each side has its own in-progress line', () => {
  const t = createTranscript();
  t.startCall({ id: 'c', startedAt: 0 });
  t.applyResult(r('c', 'customer', 1, 0, 'price please', false, 10));
  t.applyResult(r('c', 'agent', 1, 0, 'sure', false, 15));
  t.applyResult(r('c', 'customer', 1, 0, 'price please', true, 20));
  t.applyResult(r('c', 'agent', 1, 0, 'sure, one moment', true, 25));
  t.applyResult(r('c', 'customer', 1, 1, 'thanks', true, 30));
  assert.deepEqual(t.getLines('c').map((l) => `${l.side}:${l.text}`),
    ['customer:price please', 'agent:sure, one moment', 'customer:thanks']);
});

test('lines of earlier calls stay after a new call starts', () => {
  const t = createTranscript();
  t.startCall({ id: 'call-1', startedAt: 0 });
  t.applyResult(r('call-1', 'customer', 1, 0, 'first call', true, 1));
  t.startCall({ id: 'call-2', startedAt: 100 });
  t.applyResult(r('call-2', 'customer', 1, 0, 'second call', true, 101));
  assert.deepEqual(t.getLines().map((l) => l.text), ['first call', 'second call']);
  assert.deepEqual(t.getLines('call-1').map((l) => l.text), ['first call']);
});

test('finalizeOpen makes every in-progress line of a call final', () => {
  const t = createTranscript();
  t.startCall({ id: 'c', startedAt: 0 });
  t.applyResult(r('c', 'customer', 1, 0, 'half a sente', false, 1));
  t.applyResult(r('c', 'agent', 1, 0, 'and mine', false, 2));
  const changed = t.finalizeOpen('c');
  assert.deepEqual(changed.map((l) => [l.text, l.final]), [['half a sente', true], ['and mine', true]]);
  assert.ok(t.getLines('c').every((l) => l.final));
});

test('clear forgets every call and line (New call, FR-040)', () => {
  const t = createTranscript();
  t.startCall({ id: 'call-1', startedAt: 0 });
  t.applyResult(r('call-1', 'customer', 1, 0, 'still in progress', false, 1));
  t.clear();
  assert.deepEqual(t.getCalls(), []);
  assert.deepEqual(t.getLines(), []);
  t.startCall({ id: 'call-2', startedAt: 5 });
  const { line } = t.applyResult(r('call-2', 'customer', 1, 0, 'fresh', false, 6));
  assert.equal(line.text, 'fresh');
  assert.equal(t.getLines().length, 1);
});

test('markEcho flags a line, and later updates keep the flag', () => {
  const t = createTranscript();
  t.startCall({ id: 'c', startedAt: 0 });
  t.applyResult(r('c', 'agent', 1, 0, 'hello I want', false, 1));
  assert.equal(t.markEcho('c:agent:1:0').echo, true);
  const { line } = t.applyResult(r('c', 'agent', 1, 0, 'hello I want the price', true, 2));
  assert.equal(line.echo, true);
  assert.equal(t.markEcho('nope'), null);
});

// Chrome's SpeechRecognitionResultList: finals first, then one or more interim pieces.
const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal });

test('summarizeResults returns new finals and merges interim pieces into one', () => {
  const list = [result('hello', true), result(' I want', false), result(' the price', false)];
  assert.deepEqual(summarizeResults(list, 0), {
    finals: [{ index: 0, text: 'hello' }],
    interim: { index: 1, text: 'I want the price' },
  });
});

test('summarizeResults starts at resultIndex and drops empty text', () => {
  const list = [result('old', true), result('new final', true), result('  ', false)];
  assert.deepEqual(summarizeResults(list, 1), { finals: [{ index: 1, text: 'new final' }], interim: null });
});
