import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStallWatch } from '../../web/js/core/stall-watch.js';

// Found in the 10-minute soak (test-log Finding 6): a Chrome session can stop sending
// results while sound keeps arriving, without any error or end event. The stall watch
// asks for a fresh session when someone has been speaking for 3 s with no result at all.

const opts = { soundMs: 3000, minLevel: 0.006, gapMs: 1000, cooldownMs: 8000 };

test('normal speech with results never asks for a restart', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 6000; t += 100) {
    if (t === 900) w.onResult(t);           // first words arrive after about 1 s
    if (t > 900 && t % 1000 === 0) w.onResult(t);
    assert.equal(w.sample(0.1, t), false, `t=${t}`);
  }
});

test('3 s of sound with no results asks for one restart', () => {
  const w = createStallWatch(opts);
  let asked = 0;
  for (let t = 0; t <= 4000; t += 100) if (w.sample(0.1, t)) asked++;
  assert.equal(asked, 1);
});

test('short gaps between words still count as one stretch of speech', () => {
  const w = createStallWatch(opts);
  let asked = false;
  for (let t = 0; t <= 4000; t += 100) {
    const gap = t % 1000 >= 600;            // 400 ms of quiet every second
    asked = w.sample(gap ? 0 : 0.1, t) || asked;
  }
  assert.equal(asked, true);
});

test('quiet longer than the gap starts a new stretch', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 2000; t += 100) assert.equal(w.sample(0.1, t), false);
  for (let t = 2100; t <= 4000; t += 100) assert.equal(w.sample(0, t), false);
  for (let t = 4100; t <= 6000; t += 100) assert.equal(w.sample(0.1, t), false); // only 1.9 s so far
});

test('after a restart it waits for the cooldown before asking again', () => {
  const w = createStallWatch(opts);
  const asks = [];
  for (let t = 0; t <= 20000; t += 100) if (w.sample(0.1, t)) asks.push(t);
  assert.deepEqual(asks, [3000, 11000, 19000]);
});

test('a result during the stretch cancels the request', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 2500; t += 100) w.sample(0.1, t);
  w.onResult(2500);
  for (let t = 2600; t <= 5000; t += 100) assert.equal(w.sample(0.1, t), false);
});

// Seen on Chrome 157 (test-log Finding 9): a stuck session can keep sending result events
// that repeat the same words. Only words that change count as progress.
test('result events that repeat the same text are not progress', () => {
  const w = createStallWatch(opts);
  let asked = 0;
  for (let t = 0; t <= 4500; t += 100) {
    if (t === 900) w.onResult(t, 'hello I want');
    if (t > 900 && t % 300 === 0) w.onResult(t, 'hello I want');   // the same words again and again
    if (w.sample(0.1, t)) asked++;
  }
  assert.equal(asked, 1);
});

test('text that keeps changing is progress', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 6000; t += 100) {
    if (t >= 900 && t % 300 === 0) w.onResult(t, 'word '.repeat(t / 300));
    assert.equal(w.sample(0.1, t), false, `t=${t}`);
  }
});

// Review 2026-11-20 (B5): if the speech service silently returns nothing, the page kept
// restarting without telling the agent. Three restarts in a row with no progress in
// between mean the service is not responding.
test('three restarts in a row without progress mark the lane as stuck; new words clear it', () => {
  const w = createStallWatch(opts);
  const asks = [];
  for (let t = 0; t <= 20000; t += 100) if (w.sample(0.1, t)) asks.push(t);
  assert.deepEqual(asks, [3000, 11000, 19000]);
  assert.equal(w.stuck, true);
  w.onResult(20100, 'hello again');
  assert.equal(w.stuck, false);
});

test('two fruitless restarts are not yet stuck', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 12000; t += 100) w.sample(0.1, t);
  assert.equal(w.stuck, false);
});

test('slow first results (up to 3 s) are not mistaken for a stall', () => {
  const w = createStallWatch(opts);
  for (let t = 0; t <= 4000; t += 100) {
    if (t >= 2500 && t % 300 === 0) w.onResult(t);
    assert.equal(w.sample(0.1, t), false, `t=${t}`);
  }
});
