import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRelayClient } from '../../web/js/browser/relay-client.js';
import { buildStatus, buildEnd } from '../../web/js/core/protocol.js';

// The agent page's side of the customer link (contracts/relay-protocol.md), driven here
// with a stand-in socket and a stand-in clock.

const SESSION = { sid: 'OAt2jsCx_hA_81vUDXyTse', token: 'A'.repeat(43), created: 1767225600000 };
const cap = (id, text, final = true) => ({ id, text, final, lang: 'en-US' });

class FakeSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = 0;
    this.sent = [];
    this.closed = null;
  }
  send(data) { this.sent.push(data); }
  close(code, reason) { this.readyState = 3; this.closed = { code, reason }; }
  // What the network does to the socket:
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data }); }
  drop(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
  goLive() { this.open(); this.message(buildStatus('live')); }
  texts() { return this.sent.filter((f) => f.startsWith('{')).map((f) => JSON.parse(f)).filter((m) => m.t === 'caption').map((m) => m.text); }
}

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: SESSION.created + 5000 });
  const sockets = [];
  const states = [];
  class Socket extends FakeSocket {
    constructor(url, protocols) { super(url, protocols); sockets.push(this); }
  }
  const client = createRelayClient({
    origin: 'https://lct.example', session: SESSION, onState: (s) => states.push(s), WebSocketImpl: Socket,
  });
  return { client, sockets, states, tick: (ms) => t.mock.timers.tick(ms) };
}

test('connects as the agent with the token in the subprotocol; live only when the relay says so', (t) => {
  const { client, sockets, states } = setup(t);
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].url, `wss://lct.example/ws?role=agent&sid=${SESSION.sid}`);
  assert.deepEqual(sockets[0].protocols, ['lct1', `auth.${SESSION.token}.${SESSION.created}`]);
  sockets[0].open();
  assert.equal(client.state, 'connecting');          // an open socket is not enough
  sockets[0].message(buildStatus('live'));
  assert.deepEqual(states, ['connecting', 'live']);
  client.end();
});

test('a live link sends final lines at once', (t) => {
  const { client, sockets } = setup(t);
  sockets[0].goLive();
  client.sendCaption(cap('a', 'hello there'));
  assert.deepEqual(sockets[0].texts(), ['hello there']);
  client.end();
});

test('in-progress words go out at most once a second per line', (t) => {
  const { client, sockets, tick } = setup(t);
  sockets[0].goLive();
  client.sendCaption(cap('a', 'h', false));
  tick(200);
  client.sendCaption(cap('a', 'he', false));
  tick(300);
  client.sendCaption(cap('a', 'hel', false));
  assert.deepEqual(sockets[0].texts(), ['h']);
  tick(500);
  assert.deepEqual(sockets[0].texts(), ['h', 'hel']);
  client.end();
});

// Review 2026-11-12 (B8): 20 waiting lines used to be sent in one burst after a reconnect,
// and the relay (5 frames a second) dropped 15 of them.
test('lines spoken before the link is live wait, then go out in order, a few per second', (t) => {
  const { client, sockets, tick } = setup(t);
  const s = sockets[0];
  client.sendCaption(cap('a', 'first'));
  client.sendCaption(cap('b', 'typing', false));     // in-progress words are not kept
  client.sendCaption(cap('b', 'second'));
  client.sendCaption(cap('c', 'third'));
  s.open();
  assert.deepEqual(s.sent, []);                      // nothing before the relay says live
  s.message(buildStatus('live'));
  tick(1000);
  const afterOneSecond = s.texts().length;
  assert.ok(afterOneSecond >= 1 && afterOneSecond <= 3, `sent ${afterOneSecond} in the first second`);
  tick(1000);
  assert.deepEqual(s.texts(), ['first', 'second', 'third']);
  client.end();
});

test('twenty waiting lines all arrive, never more than 3 in any second', (t) => {
  const { client, sockets, tick } = setup(t);
  for (let i = 0; i < 20; i++) client.sendCaption(cap(`l${i}`, `line ${i}`));
  sockets[0].goLive();
  let previous = 0;
  for (let second = 0; second < 10; second++) {
    tick(1000);
    const now = sockets[0].texts().length;
    assert.ok(now - previous <= 3, `second ${second}: ${now - previous} frames`);
    previous = now;
  }
  assert.deepEqual(sockets[0].texts(), Array.from({ length: 20 }, (_, i) => `line ${i}`));
  client.end();
});

test('while lines are waiting, a new line queues behind them', (t) => {
  const { client, sockets, tick } = setup(t);
  client.sendCaption(cap('a', 'old one'));
  client.sendCaption(cap('b', 'old two'));
  sockets[0].goLive();
  client.sendCaption(cap('c', 'new'));
  tick(3000);
  assert.deepEqual(sockets[0].texts(), ['old one', 'old two', 'new']);
  client.end();
});

test('after a drop it reconnects with the same token: 1 s, 2 s, 4 s, then every 5 s', (t) => {
  const { client, sockets, states, tick } = setup(t);
  sockets[0].goLive();
  sockets[0].drop();
  assert.equal(states.at(-1), 'reconnecting');
  for (const wait of [1000, 2000, 4000, 5000, 5000]) {
    const before = sockets.length;
    tick(wait - 1);
    assert.equal(sockets.length, before, `no retry before ${wait} ms`);
    tick(1);
    assert.equal(sockets.length, before + 1, `retry after ${wait} ms`);
    assert.deepEqual(sockets.at(-1).protocols, sockets[0].protocols);
    sockets.at(-1).drop();
  }
  client.end();
});

test('lines spoken while the link is down are kept and sent after it is live again', (t) => {
  const { client, sockets, states, tick } = setup(t);
  sockets[0].goLive();
  sockets[0].drop();
  client.sendCaption(cap('a', 'said while down'));
  tick(1000);
  sockets[1].goLive();
  assert.equal(states.at(-1), 'live');
  tick(1000);
  assert.deepEqual(sockets[1].texts(), ['said while down']);
  client.end();
});

// Review 2026-11-12 (B7): after 60 s down the link stayed dead for the rest of the call.
test('it gives up after 60 s; retry() (Copy customer link) starts it again', (t) => {
  const { client, sockets, states, tick } = setup(t);
  sockets[0].goLive();
  sockets[0].drop();
  for (let guard = 0; client.state !== 'unavailable' && guard < 200; guard++) {
    const before = sockets.length;
    tick(1000);
    if (sockets.length > before) sockets.at(-1).drop();
  }
  assert.equal(client.state, 'unavailable');
  const given = sockets.length;
  tick(120_000);
  assert.equal(sockets.length, given);               // no more attempts by itself
  client.retry();
  assert.equal(sockets.length, given + 1);
  sockets.at(-1).goLive();
  assert.deepEqual(states.slice(-3), ['unavailable', 'reconnecting', 'live']);
  client.retry();                                    // nothing to do while it works
  assert.equal(sockets.length, given + 1);
  client.end();
});

test('a link that never reached the relay says so at once, but keeps trying', (t) => {
  const { client, sockets, states, tick } = setup(t);
  sockets[0].drop();
  assert.deepEqual(states, ['connecting', 'unavailable']);
  tick(1000);
  assert.equal(sockets.length, 2);
  sockets[1].goLive();
  assert.equal(client.state, 'live');
  client.end();
});

test('a heartbeat goes out every 30 s while the socket is open', (t) => {
  const { client, sockets, tick } = setup(t);
  sockets[0].goLive();
  tick(30_000);
  tick(30_000);
  assert.equal(sockets[0].sent.filter((f) => f === 'ping').length, 2);
  client.end();
});

test('end tells the relay, closes the socket, and nothing is sent afterwards', (t) => {
  const { client, sockets, states, tick } = setup(t);
  sockets[0].goLive();
  client.end();
  assert.equal(sockets[0].sent.at(-1), buildEnd());
  assert.deepEqual(sockets[0].closed, { code: 1000, reason: 'ended' });
  assert.equal(states.at(-1), 'ended');
  const sent = sockets[0].sent.length;
  client.sendCaption(cap('a', 'too late'));
  client.retry();
  tick(120_000);
  assert.equal(sockets[0].sent.length, sent);
  assert.equal(sockets.length, 1);
});

test('the relay ending or expiring the call ends the link', (t) => {
  const a = setup(t);
  a.sockets[0].goLive();
  a.sockets[0].message(buildStatus('expired'));
  assert.equal(a.client.state, 'ended');
});

test('close codes 4000 and 4001 end the link without a retry', (t) => {
  const { client, sockets, tick } = setup(t);
  sockets[0].goLive();
  sockets[0].drop(4001);
  assert.equal(client.state, 'ended');
  tick(60_000);
  assert.equal(sockets.length, 1);
});
