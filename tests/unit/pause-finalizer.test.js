import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPauseFinalizer } from '../../web/js/core/pause-finalizer.js';

// Chrome 154 returns Urdu finals only when the recognition session ends (about 14 s of
// silence), while English finalizes on its own about 1.4 s after speech. The finalizer
// asks for a final once the speaker has paused and an in-progress line is still open.

const opts = { silenceMs: 1500, minLevel: 0.006, maxChars: 600 };

test('nothing to finalize without an in-progress line', () => {
  const f = createPauseFinalizer(opts);
  f.sample(0.1, 0);
  assert.equal(f.sample(0, 5000), false);
});

test('finalizes once after a 1.5 s pause with an open in-progress line', () => {
  const f = createPauseFinalizer(opts);
  f.sample(0.1, 0);
  f.onResult({ final: false, text: 'السلام علیکم' });
  f.sample(0.1, 1000);                         // still speaking
  assert.equal(f.sample(0.001, 2000), false);  // 1.0 s of silence
  assert.equal(f.sample(0.001, 2499), false);
  assert.equal(f.sample(0.001, 2500), true);   // 1.5 s of silence
  assert.equal(f.sample(0.001, 4000), false);  // only once
});

test('a final from Chrome itself (English) cancels the request', () => {
  const f = createPauseFinalizer(opts);
  f.sample(0.1, 0);
  f.onResult({ final: false, text: 'hello I want' });
  f.onResult({ final: true, text: 'hello I want the price' });
  assert.equal(f.sample(0, 5000), false);
});

test('speech resuming before 1.5 s keeps waiting', () => {
  const f = createPauseFinalizer(opts);
  f.sample(0.1, 0);
  f.onResult({ final: false, text: 'one' });
  f.sample(0, 1000);
  f.sample(0.1, 1400);                         // speaks again
  assert.equal(f.sample(0, 2800), false);      // 1.4 s since the last sound
  assert.equal(f.sample(0, 2900), true);
});

test('a very long in-progress line is finalized even without a pause', () => {
  const f = createPauseFinalizer(opts);
  f.onResult({ final: false, text: 'x'.repeat(600) });
  assert.equal(f.sample(0.2, 100), true);
});

test('a new in-progress line after finalizing arms it again', () => {
  const f = createPauseFinalizer(opts);
  f.sample(0.1, 0);
  f.onResult({ final: false, text: 'first' });
  assert.equal(f.sample(0, 1500), true);
  f.onResult({ final: false, text: 'second' });
  f.sample(0.1, 2000);
  assert.equal(f.sample(0, 3500), true);
});
