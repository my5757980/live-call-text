import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAgc } from '../../web/js/core/agc.js';

// Measured 2026-10-03 (test-log Finding 7): soft English call audio was only 50% correct,
// and 94% after a 10x boost. The AGC raises soft speech towards a steady level, holds its
// gain during silence, and tells speech from background noise.

const run = (agc, rms, frames) => {
  let out;
  for (let i = 0; i < frames; i++) out = agc.update(rms, 100);
  return out;
};

test('normal speech keeps a gain of about 1', () => {
  const agc = createAgc();
  const out = run(agc, 0.09, 30);
  assert.equal(out.speech, true);
  assert.ok(out.gain >= 1 && out.gain < 1.3, `gain ${out.gain}`);
});

test('soft speech is raised towards the target within about 2 seconds', () => {
  const agc = createAgc();
  const out = run(agc, 0.009, 20);
  assert.ok(out.gain > 8 && out.gain <= 11.2, `gain ${out.gain}`);
});

test('very soft speech is capped at the maximum gain', () => {
  const agc = createAgc({ maxGain: 40 });
  assert.ok(Math.abs(run(agc, 0.0022, 60).gain - 40) < 0.5);
});

test('loud speech after soft speech brings the gain down quickly', () => {
  const agc = createAgc();
  run(agc, 0.009, 30);
  const out = run(agc, 0.15, 5);
  assert.ok(out.gain < 1.5, `gain ${out.gain}`);
});

test('the gain never goes below 1; peaks are left to the compressor', () => {
  assert.equal(run(createAgc(), 0.4, 20).gain, 1);
});

test('silence holds the gain and is not speech', () => {
  const agc = createAgc();
  const soft = run(agc, 0.009, 30).gain;
  const out = run(agc, 0, 50);
  assert.equal(out.speech, false);
  assert.equal(out.gain, soft);
});

test('steady background noise is not speech, but speech above it is', () => {
  const agc = createAgc();
  assert.equal(run(agc, 0.001, 300).speech, false);   // 30 s of call noise
  assert.equal(run(agc, 0.01, 1).speech, true);       // someone talks over it
});
