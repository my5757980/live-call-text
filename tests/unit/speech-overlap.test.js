import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechOverlap } from '../../web/js/core/speech-overlap.js';

// How much of the agent's speaking time fell on moments when the customer was speaking
// too (review 2026-11-12, B1). The echo filter uses it to tell echo from a repeat-back.

function fill(o, from, to, state) {
  for (let t = from; t < to; t += 100) o.sample(state, t);
}

test('speech at the same moments overlaps fully', () => {
  const o = createSpeechOverlap();
  fill(o, 0, 3000, { agent: true, customer: true });
  assert.deepEqual(o.ratio(0, 3000), { agentMs: 3000, overlapMs: 3000, ratio: 1 });
});

test('an agent who speaks after the customer stops does not overlap', () => {
  const o = createSpeechOverlap();
  fill(o, 0, 3000, { agent: false, customer: true });
  fill(o, 3000, 4500, { agent: false, customer: false });
  fill(o, 4500, 6500, { agent: true, customer: false });
  const r = o.ratio(3000, 7000);
  assert.equal(r.agentMs, 2000);
  assert.equal(r.ratio, 0);
});

test('a customer who spoke within 300 ms still counts as overlapping', () => {
  const o = createSpeechOverlap();
  fill(o, 0, 1000, { agent: true, customer: true });
  fill(o, 1000, 1300, { agent: true, customer: false });     // short gap between the customer's words
  fill(o, 1300, 2000, { agent: true, customer: true });
  assert.equal(o.ratio(0, 2000).ratio, 1);
});

test('partial overlap is a share of the agent time', () => {
  const o = createSpeechOverlap();
  fill(o, 0, 1000, { agent: true, customer: true });
  fill(o, 1000, 2000, { agent: false, customer: false });
  fill(o, 2000, 5000, { agent: true, customer: false });
  const r = o.ratio(0, 5000);
  assert.equal(r.agentMs, 4000);
  assert.ok(r.ratio > 0.2 && r.ratio < 0.4, `ratio ${r.ratio}`);
});

test('too little agent speech gives no answer', () => {
  const o = createSpeechOverlap();
  fill(o, 0, 200, { agent: true, customer: true });
  fill(o, 200, 3000, { agent: false, customer: true });
  assert.equal(o.ratio(0, 3000).ratio, null);
  assert.equal(createSpeechOverlap().ratio(0, 1000).ratio, null);
});

test('only the asked time range counts, and old samples are forgotten', () => {
  const o = createSpeechOverlap({ keepMs: 10000 });
  fill(o, 0, 2000, { agent: true, customer: true });
  fill(o, 2000, 4000, { agent: true, customer: false });
  assert.equal(o.ratio(2500, 4000).ratio, 0);
  fill(o, 4000, 20000, { agent: false, customer: false });
  assert.equal(o.ratio(0, 4000).ratio, null);                // those samples are gone
});
