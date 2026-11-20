import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTicker } from '../../web/js/browser/ticker.js';

// The page's 100 ms loop (pause, stall and echo checks, the automatic gain) must keep its
// pace while the page is hidden behind WhatsApp. Chrome slows a hidden page's own timers
// to once a second (measured 2026-11-20), so the ticks come from a worker.

class FakeWorker {
  constructor() { this.sent = []; this.terminated = false; }
  postMessage(m) { this.sent.push(m); }
  terminate() { this.terminated = true; }
  tick() { this.onmessage?.({ data: 0 }); }
  fail() { this.onerror?.({ message: 'failed to load' }); }
}

test('ticks come from the worker at the asked pace, and stop ends it', () => {
  const worker = new FakeWorker();
  let ticks = 0;
  const stop = startTicker(() => ticks++, 100, { createWorker: () => worker });
  assert.deepEqual(worker.sent, [{ ms: 100 }]);
  worker.tick();
  worker.tick();
  assert.equal(ticks, 2);
  stop();
  assert.equal(worker.terminated, true);
  worker.tick();                                   // a tick already on its way is ignored
  assert.equal(ticks, 2);
});

test('without a worker it falls back to the page timer', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let ticks = 0;
  const stop = startTicker(() => ticks++, 100, { createWorker: () => { throw new Error('no workers here'); } });
  t.mock.timers.tick(350);
  assert.equal(ticks, 3);
  stop();
  t.mock.timers.tick(1000);
  assert.equal(ticks, 3);
});

test('a worker that fails to load before its first tick is replaced by the page timer', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const worker = new FakeWorker();
  let ticks = 0;
  const stop = startTicker(() => ticks++, 100, { createWorker: () => worker });
  worker.fail();
  assert.equal(worker.terminated, true);
  t.mock.timers.tick(200);
  assert.equal(ticks, 2);
  stop();
  t.mock.timers.tick(1000);
  assert.equal(ticks, 2);
});

test('an error after ticks have arrived does not start a second timer', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const worker = new FakeWorker();
  let ticks = 0;
  startTicker(() => ticks++, 100, { createWorker: () => worker });
  worker.tick();
  worker.fail();
  t.mock.timers.tick(1000);
  assert.equal(ticks, 1);
});
