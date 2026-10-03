import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createThrottle } from '../../web/js/core/throttle.js';

function clock(start = 0) {
  let t = start;
  return { now: () => t, set: (v) => { t = v; } };
}
const cap = (id, text, final = false) => ({ id, text, final, lang: 'en-US' });

test('interim updates for one line go out at most once per second; latest text wins', () => {
  const c = clock();
  const th = createThrottle({ intervalMs: 1000, now: c.now });
  assert.deepEqual(th.offer(cap('a', 'h')), [cap('a', 'h')]);
  c.set(200);
  assert.deepEqual(th.offer(cap('a', 'he')), []);
  c.set(500);
  assert.deepEqual(th.offer(cap('a', 'hel')), []);
  c.set(900);
  assert.deepEqual(th.tick(), []);
  c.set(1000);
  assert.deepEqual(th.tick(), [cap('a', 'hel')]);
  assert.deepEqual(th.tick(), []);
});

test('a final goes out at once and drops the pending interim for that line', () => {
  const c = clock();
  const th = createThrottle({ intervalMs: 1000, now: c.now });
  th.offer(cap('a', 'one'));
  c.set(300);
  th.offer(cap('a', 'one two'));
  assert.deepEqual(th.offer(cap('a', 'one two three', true)), [cap('a', 'one two three', true)]);
  c.set(2000);
  assert.deepEqual(th.tick(), []);
});

test('different lines are throttled independently', () => {
  const c = clock();
  const th = createThrottle({ intervalMs: 1000, now: c.now });
  assert.deepEqual(th.offer(cap('a', 'x')), [cap('a', 'x')]);
  assert.deepEqual(th.offer(cap('b', 'y')), [cap('b', 'y')]);
  c.set(100);
  assert.deepEqual(th.offer(cap('a', 'xx')), []);
  assert.deepEqual(th.offer(cap('b', 'yy')), []);
  c.set(1100);
  assert.deepEqual(th.tick(), [cap('a', 'xx'), cap('b', 'yy')]);
});
