import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLaneRunner } from '../../web/js/browser/recognizer.js';

// The runner that keeps one side's speech recognition going (research.md R5), driven here
// with a stand-in SpeechRecognition and a stand-in clock. Real Chrome behaviour is covered
// by the e2e tests; these pin down the restart, flush, watchdog and back-off rules.

const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal });
// Lets queued microtasks run (a new session is started in one, not on a timer).
const settle = () => Promise.resolve().then(() => Promise.resolve());

async function setup(t, { lang = 'en-US' } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1767225600000 });
  const sessions = [];
  class Recognition {
    constructor() { this.calls = []; sessions.push(this); }
    start(track) { this.track = track; this.calls.push('start'); }
    stop() { this.calls.push('stop'); }
    abort() { this.calls.push('abort'); }
    // What Chrome does to the session:
    fireStart() { this.onstart?.(); }
    fireResult(list, resultIndex = 0) { this.onresult?.({ results: list, resultIndex }); }
    fireError(error) { this.onerror?.({ error }); }
    fireEnd() { this.onend?.(); }
  }
  const listeners = {};
  const win = {
    SpeechRecognition: Recognition,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  };
  const track = { readyState: 'live' };
  const results = [];
  const states = [];
  const runner = createLaneRunner({
    side: 'customer', track, lang, win,
    onResult: (r) => results.push(r), onState: (s) => states.push(s),
  });
  const tick = async (ms) => { t.mock.timers.tick(ms); await settle(); };
  runner.start();
  await settle();
  return { runner, sessions, track, results, states, tick, emit: (type) => listeners[type]?.() };
}

const last = (states) => {
  const s = states.at(-1);
  return [s.state, s.pauseReason, s.message ?? null];
};

test('start opens a continuous session on the given track, in the lane language', async (t) => {
  const { sessions, track, states } = await setup(t, { lang: 'ur-PK' });
  assert.equal(sessions.length, 1);
  const s = sessions[0];
  assert.deepEqual([s.lang, s.continuous, s.interimResults, s.track, s.calls], ['ur-PK', true, true, track, ['start']]);
  s.fireStart();
  assert.deepEqual(last(states), ['listening', null, null]);
});

test('results become line events with the session and result index', async (t) => {
  const { sessions, results } = await setup(t);
  const s = sessions[0];
  s.fireStart();
  s.fireResult([result('hello I', false)]);
  s.fireResult([result('hello I want the price', true), result(' how many', false)]);
  assert.deepEqual(results, [
    { side: 'customer', session: 1, resultIndex: 0, text: 'hello I', final: false, lang: 'en-US' },
    { side: 'customer', session: 1, resultIndex: 0, text: 'hello I want the price', final: true, lang: 'en-US' },
    { side: 'customer', session: 1, resultIndex: 1, text: 'how many', final: false, lang: 'en-US' },
  ]);
});

// Review 2026-11-12 (B6) and 2026-11-20 (B3): a new session must not wait for a timer.
// Chrome slows a hidden page's timers to once a second, so even a 0 ms timer could leave
// a gap of up to a second in which the customer's first words are lost.
test('a session that ends by itself is replaced at once, without waiting for any timer', async (t) => {
  const { sessions, tick } = await setup(t);
  sessions[0].fireStart();
  await tick(8000);                                // Chrome ends a quiet session after about 8 s
  sessions[0].fireError('no-speech');
  sessions[0].fireEnd();
  await settle();                                  // no clock tick at all
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].lang, 'en-US');
});

test('finalizeNow stops the session; words Chrome leaves unfinished are kept as a final line', async (t) => {
  const { runner, sessions, results } = await setup(t);
  const s = sessions[0];
  s.fireStart();
  s.fireResult([result('kya haal', false)]);
  runner.finalizeNow();
  assert.deepEqual(s.calls, ['start', 'stop']);
  s.fireEnd();                                     // no final came back
  assert.deepEqual(results.at(-1), { side: 'customer', session: 1, resultIndex: 0, text: 'kya haal', final: true, lang: 'en-US' });
  await settle();
  assert.equal(sessions.length, 2);                // and the next session starts at once
});

test('a final sent by Chrome is not repeated when the session ends', async (t) => {
  const { runner, sessions, results } = await setup(t);
  const s = sessions[0];
  s.fireStart();
  s.fireResult([result('kya haal', false)]);
  runner.finalizeNow();
  s.fireResult([result('kya haal hai', true)]);
  s.fireEnd();
  assert.deepEqual(results.map((r) => [r.text, r.final]), [['kya haal', false], ['kya haal hai', true]]);
});

test('a language change aborts the session and starts a new one in the new language', async (t) => {
  const { runner, sessions } = await setup(t);
  sessions[0].fireStart();
  runner.setLang('ur-PK');
  assert.deepEqual(sessions[0].calls, ['start', 'abort']);
  sessions[0].fireEnd();
  await settle();
  assert.equal(sessions[1].lang, 'ur-PK');
});

// test-log Finding 4: Chrome does not fire `end` after aborting a session that has not
// fired `start` yet. Waiting for it cost 1.5 s, which pushed recovery after a network drop
// close to the 5 s limit (SC-005, test-log 2026-11-20): such a session is replaced at once.
test('a session aborted before it started is replaced at once, without waiting for its end', async (t) => {
  const { runner, sessions, results } = await setup(t);
  const old = sessions[0];
  runner.setLang('ur-PK');                         // before the session fired `start`
  assert.deepEqual(old.calls, ['start', 'abort']);
  await settle();
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].lang, 'ur-PK');
  old.fireResult([result('late words', false)]);   // the old session is ignored from now on
  old.fireEnd();
  await settle();
  assert.deepEqual(results, []);
  assert.equal(sessions.length, 2);
});

test('if Chrome never ends a started session that was aborted, the runner replaces it after 1.5 s', async (t) => {
  const { runner, sessions, results, tick } = await setup(t);
  const old = sessions[0];
  old.fireStart();
  runner.setLang('ur-PK');
  await tick(1499);
  assert.equal(sessions.length, 1);
  await tick(1);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].lang, 'ur-PK');
  old.fireResult([result('late words', false)]);
  old.fireEnd();
  await tick(5000);
  assert.deepEqual(results, []);
  assert.equal(sessions.length, 2);
});

test('coming back online right after Start is resolved within about 3 s', async (t) => {
  const { sessions, states, tick, emit } = await setup(t);
  emit('offline');                                 // before the first session fired `start`
  assert.deepEqual(last(states), ['paused', 'no-internet', 'W_NO_INTERNET']);
  emit('online');
  await settle();
  assert.equal(sessions.length, 2);                // replaced at once
  sessions[1].fireStart();
  await tick(3000);                                // 3 s without an error proves it healthy
  assert.deepEqual(last(states), ['listening', null, null]);
});

test('restartNow replaces a session that has gone quiet', async (t) => {
  const { runner, sessions } = await setup(t);
  sessions[0].fireStart();
  runner.restartNow();
  assert.deepEqual(sessions[0].calls, ['start', 'abort']);
  sessions[0].fireEnd();
  await settle();
  assert.equal(sessions.length, 2);
});

test('two restart requests at once still give one new session', async (t) => {
  const { runner, sessions, emit } = await setup(t);
  sessions[0].fireStart();
  sessions[0].fireEnd();                           // a quick end: retried after 500 ms
  emit('online');                                  // nothing to do: not paused
  runner.restartNow();                             // not running: starts now
  await settle();
  assert.equal(sessions.length, 2);
  await t.mock.timers.tick(500);
  await settle();
  assert.equal(sessions.length, 2);                // the 500 ms retry finds a session running
});

// Review 2026-11-12 (B5): sessions that die straight away used to restart four times a
// second, with the status still "Listening" and no message.
test('sessions that end at once are retried more slowly; the third one shows the pause', async (t) => {
  const { sessions, states, tick } = await setup(t);
  sessions[0].fireStart();
  sessions[0].fireEnd();
  assert.deepEqual(last(states), ['starting', null, null]);
  await tick(499);
  assert.equal(sessions.length, 1);
  await tick(1);
  assert.equal(sessions.length, 2);
  sessions[1].fireStart();
  sessions[1].fireEnd();
  await tick(999);
  assert.equal(sessions.length, 2);
  await tick(1);
  assert.equal(sessions.length, 3);
  sessions[2].fireStart();
  sessions[2].fireEnd();
  assert.deepEqual(last(states), ['paused', 'speech-service', 'W_SPEECH_SERVICE']);
  await tick(2000);
  assert.equal(sessions.length, 4);
  sessions[3].fireStart();
  assert.deepEqual(last(states), ['paused', 'speech-service', 'W_SPEECH_SERVICE']);   // `start` proves nothing
  sessions[3].fireResult([result('hello', false)]);
  assert.deepEqual(last(states), ['listening', null, null]);
});

test('a session that runs 3 s without an error also clears the pause', async (t) => {
  const { sessions, states, tick } = await setup(t);
  for (const wait of [500, 1000, 2000]) {
    sessions.at(-1).fireStart();
    sessions.at(-1).fireEnd();
    await tick(wait);
  }
  assert.deepEqual(last(states), ['paused', 'speech-service', 'W_SPEECH_SERVICE']);
  sessions.at(-1).fireStart();
  await tick(3000);
  assert.deepEqual(last(states), ['listening', null, null]);
});

test('a network error pauses, retries with back-off, and retries at once when online', async (t) => {
  const { sessions, states, tick, emit } = await setup(t);
  sessions[0].fireStart();
  sessions[0].fireError('network');
  assert.deepEqual(last(states), ['paused', 'no-internet', 'W_NO_INTERNET']);
  sessions[0].fireEnd();
  await tick(500);
  assert.equal(sessions.length, 2);
  sessions[1].fireError('network');
  sessions[1].fireEnd();
  await tick(999);
  assert.equal(sessions.length, 2);
  emit('online');
  await settle();
  assert.equal(sessions.length, 3);
  sessions[2].fireStart();
  sessions[2].fireResult([result('back again', false)]);
  assert.deepEqual(last(states), ['listening', null, null]);
});

test('while the browser is offline, a result does not clear the pause', async (t) => {
  const { sessions, states, emit } = await setup(t);
  sessions[0].fireStart();
  emit('offline');
  assert.deepEqual(last(states), ['paused', 'no-internet', 'W_NO_INTERNET']);
  sessions[0].fireResult([result('still offline', false)]);
  assert.deepEqual(last(states), ['paused', 'no-internet', 'W_NO_INTERNET']);
});

test('stop aborts the session, keeps its unfinished words, and nothing restarts', async (t) => {
  const { runner, sessions, results, states, tick } = await setup(t);
  const s = sessions[0];
  s.fireStart();
  s.fireResult([result('half a sente', false)]);
  runner.stop();
  assert.deepEqual(s.calls, ['start', 'abort']);
  assert.equal(states.at(-1).state, 'stopped');
  s.fireEnd();
  assert.deepEqual(results.at(-1), { side: 'customer', session: 1, resultIndex: 0, text: 'half a sente', final: true, lang: 'en-US' });
  runner.finalizeNow();
  runner.restartNow();
  runner.setLang('ur-PK');
  await tick(10_000);
  assert.equal(sessions.length, 1);
});

test('when the track has ended, the lane stops instead of starting a session', async (t) => {
  const { sessions, track, states } = await setup(t);
  sessions[0].fireStart();
  sessions[0].fireResult([result('bye', true)]);
  track.readyState = 'ended';
  sessions[0].fireEnd();
  await settle();
  assert.equal(sessions.length, 1);
  assert.equal(states.at(-1).state, 'stopped');
});
