import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decide, initialLane, retryDelay, RETRY_DELAYS_MS, RESTART_AFTER_END_MS,
} from '../../web/js/core/lane-policy.js';

const lane = (over = {}) => ({ ...initialLane('en-US'), ...over });
const listening = lane({ state: 'listening' });

test('retry delays are 0.5 s, 1 s, 2 s, then 3 s (research R5)', () => {
  assert.deepEqual(RETRY_DELAYS_MS, [500, 1000, 2000, 3000]);
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(retryDelay), [500, 1000, 2000, 3000, 3000, 3000]);
});

test('start asks for an immediate start', () => {
  const d = decide(lane(), { type: 'start' });
  assert.equal(d.state, 'starting');
  assert.equal(d.action, 'restart');
  assert.equal(d.delayMs, 0);
});

test('started means listening and resets the retry step', () => {
  const d = decide(lane({ state: 'starting', retryStep: 3 }), { type: 'started' });
  assert.deepEqual(
    { state: d.state, retryStep: d.retryStep, pauseReason: d.pauseReason, action: d.action, message: d.message },
    { state: 'listening', retryStep: 0, pauseReason: null, action: 'none', message: null });
});

// Chrome fires `start` locally before it reaches the speech service, so `start` alone
// does not prove the service is back. That would make the status flicker while offline.
test('started while paused stays paused until the session proves healthy', () => {
  const paused = lane({ state: 'paused', pauseReason: 'no-internet', retryStep: 2 });
  const s = decide(paused, { type: 'started' });
  assert.deepEqual([s.state, s.pauseReason, s.message], ['paused', 'no-internet', 'W_NO_INTERNET']);
  const h = decide({ ...paused, state: s.state }, { type: 'healthy' });
  assert.deepEqual([h.state, h.pauseReason, h.retryStep, h.message], ['listening', null, 0, null]);
});

test('while the browser is offline nothing clears the pause', () => {
  const off = decide(lane({ state: 'listening' }), { type: 'offline' });
  assert.equal(off.offline, true);
  const asLane = (d) => ({ state: d.state, retryStep: d.retryStep, pauseReason: d.pauseReason, lang: d.lang, offline: d.offline });
  assert.equal(decide(asLane(off), { type: 'started' }).state, 'paused');
  assert.equal(decide(asLane(off), { type: 'healthy' }).state, 'paused');
  const on = decide(asLane(off), { type: 'online' });
  assert.equal(on.offline, false);
  assert.equal(decide(asLane(on), { type: 'healthy' }).state, 'listening');
});

test('end while listening restarts after 250 ms', () => {
  const d = decide(listening, { type: 'end' });
  assert.equal(RESTART_AFTER_END_MS, 250);
  assert.deepEqual({ state: d.state, action: d.action, delayMs: d.delayMs },
    { state: 'starting', action: 'restart', delayMs: 250 });
});

test('end while still starting backs off with the retry delays', () => {
  const d1 = decide(lane({ state: 'starting', retryStep: 0 }), { type: 'end' });
  assert.deepEqual([d1.action, d1.delayMs, d1.retryStep], ['restart', 500, 1]);
  const d2 = decide(lane({ state: 'starting', retryStep: 1 }), { type: 'end' });
  assert.deepEqual([d2.delayMs, d2.retryStep], [1000, 2]);
});

test('no-speech and aborted wait for the following end event', () => {
  for (const error of ['no-speech', 'aborted']) {
    const d = decide(listening, { type: 'error', error });
    assert.equal(d.action, 'none', error);
    assert.equal(d.state, 'listening', error);
  }
  assert.equal(decide(listening, { type: 'error', error: 'aborted', ours: true }).action, 'none');
});

test('network error pauses with no-internet; the following end retries with backoff', () => {
  const p = decide(listening, { type: 'error', error: 'network' });
  assert.deepEqual([p.state, p.pauseReason, p.action, p.message],
    ['paused', 'no-internet', 'none', 'W_NO_INTERNET']);
  let l = { state: p.state, retryStep: p.retryStep, pauseReason: p.pauseReason, lang: p.lang };
  const delays = [];
  for (let i = 0; i < 5; i++) {
    const d = decide(l, { type: 'end' });
    assert.equal(d.state, 'paused');
    assert.equal(d.action, 'restart');
    delays.push(d.delayMs);
    l = { state: d.state, retryStep: d.retryStep, pauseReason: d.pauseReason, lang: d.lang };
  }
  assert.deepEqual(delays, [500, 1000, 2000, 3000, 3000]);
});

test('offline pauses; online restarts at once and resets the retry step', () => {
  const p = decide(listening, { type: 'offline' });
  assert.deepEqual([p.state, p.pauseReason, p.action, p.message],
    ['paused', 'no-internet', 'none', 'W_NO_INTERNET']);
  const o = decide({ ...p, retryStep: 3 }, { type: 'online' });
  assert.deepEqual([o.action, o.delayMs, o.retryStep], ['restart', 0, 0]);
  assert.equal(decide(listening, { type: 'online' }).action, 'none');
});

test('service errors pause with speech-service', () => {
  for (const error of ['not-allowed', 'service-not-allowed']) {
    const d = decide(listening, { type: 'error', error });
    assert.deepEqual([d.state, d.pauseReason, d.message], ['paused', 'speech-service', 'W_SPEECH_SERVICE'], error);
  }
});

test('audio-capture stops the lane if the track ended, otherwise pauses', () => {
  assert.equal(decide(listening, { type: 'error', error: 'audio-capture', trackEnded: true }).action, 'stop');
  const d = decide(listening, { type: 'error', error: 'audio-capture', trackEnded: false });
  assert.deepEqual([d.state, d.pauseReason], ['paused', 'speech-service']);
});

test('an unsupported language falls back to English', () => {
  const d = decide(lane({ state: 'listening', lang: 'ur-PK' }), { type: 'error', error: 'language-not-supported' });
  assert.equal(d.lang, 'en-US');
});

test('a start that throws is retried with backoff', () => {
  const d = decide(lane({ state: 'starting', retryStep: 2 }), { type: 'error', error: 'start-failed' });
  assert.deepEqual([d.action, d.delayMs, d.retryStep], ['restart', 2000, 3]);
});

test('language change restarts at once with the new language', () => {
  const d = decide(listening, { type: 'lang-change', lang: 'ur-PK' });
  assert.deepEqual([d.lang, d.action, d.delayMs], ['ur-PK', 'restart', 0]);
});

test('stop stops, and later events are ignored', () => {
  const s = decide(listening, { type: 'stop' });
  assert.deepEqual([s.state, s.action], ['stopped', 'stop']);
  for (const type of ['end', 'online', 'started', 'lang-change']) {
    const d = decide({ state: 'stopped', retryStep: 0, pauseReason: null, lang: 'en-US' }, { type, lang: 'ur-PK' });
    assert.deepEqual([d.state, d.action], ['stopped', 'none'], type);
  }
});
