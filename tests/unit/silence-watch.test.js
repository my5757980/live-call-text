import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSilenceWatch } from '../../web/js/core/silence-watch.js';

test('no hint before start', () => {
  const w = createSilenceWatch({ thresholdMs: 20000, minLevel: 0.01 });
  assert.deepEqual(w.sample(0, 999999), { showHint: false });
});

test('hint after 20 s with no call sound, gone once sound arrives (FR-008)', () => {
  const w = createSilenceWatch({ thresholdMs: 20000, minLevel: 0.01 });
  w.start(0);
  assert.equal(w.sample(0, 19999).showHint, false);
  assert.equal(w.sample(0.005, 20000).showHint, true);  // below minLevel is silence
  assert.equal(w.sample(0.2, 25000).showHint, false);
});

test('later silence (customer quiet) does not bring the hint back', () => {
  const w = createSilenceWatch({ thresholdMs: 20000, minLevel: 0.01 });
  w.start(0);
  w.sample(0.2, 1000);
  assert.equal(w.sample(0, 90000).showHint, false);
});

test('a new start resets the watch', () => {
  const w = createSilenceWatch({ thresholdMs: 20000, minLevel: 0.01 });
  w.start(0);
  w.sample(0.2, 1000);
  w.start(100000);
  assert.equal(w.sample(0, 119999).showHint, false);
  assert.equal(w.sample(0, 120000).showHint, true);
});
