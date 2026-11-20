import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectViewer } from '../../web/js/browser/viewer-client.js';
import { buildStatus, buildCaption } from '../../web/js/core/protocol.js';

// The customer page's side of the link (contracts/relay-protocol.md, data-model
// ViewerState), driven with a stand-in socket and a stand-in clock.

const SID = 'OAt2jsCx_hA_81vUDXyTse';
const caption = (id, text) => buildCaption({ id, text, final: true, lang: 'en-US' });

class FakeSocket {
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closed = false; }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; this.closed = true; }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data }); }
  drop(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
}

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1767225600000 });
  const sockets = [];
  const states = [];
  const captions = [];
  class Socket extends FakeSocket {
    constructor(url) { super(url); sockets.push(this); }
  }
  const viewer = connectViewer({
    origin: 'https://lct.example', sid: SID, WebSocketImpl: Socket,
    onStatus: (s) => states.push(s), onCaption: (c) => captions.push(c.text),
  });
  return { viewer, sockets, states, captions, tick: (ms) => t.mock.timers.tick(ms) };
}

test('connects as a viewer; live means waiting until the agent speaks', (t) => {
  const { sockets, states, captions } = setup(t);
  assert.equal(sockets[0].url, `wss://lct.example/ws?role=viewer&sid=${SID}`);
  sockets[0].open();
  sockets[0].message(buildStatus('live'));
  assert.deepEqual(states, ['waiting']);
  sockets[0].message(caption('c:agent:1:0', 'hello'));
  assert.deepEqual(states, ['waiting', 'live']);
  assert.deepEqual(captions, ['hello']);
  sockets[0].message('not json');                    // junk is ignored
  assert.deepEqual(states, ['waiting', 'live']);
});

test('paused comes back to live; 60 s without live means the call ended', (t) => {
  const { sockets, states, tick } = setup(t);
  sockets[0].open();
  sockets[0].message(buildStatus('live'));
  sockets[0].message(buildStatus('paused'));
  tick(59_000);
  sockets[0].message(buildStatus('live'));
  assert.deepEqual(states, ['waiting', 'paused', 'waiting']);
  sockets[0].message(buildStatus('paused'));
  tick(59_999);
  assert.equal(states.at(-1), 'paused');
  tick(1);
  assert.equal(states.at(-1), 'ended');
});

test('ended, expired and invalid are shown, by status or by close code', (t) => {
  for (const [send, expected] of [
    [(s) => s.message(buildStatus('ended')), 'ended'],
    [(s) => s.message(buildStatus('expired')), 'ended'],
    [(s) => s.message(buildStatus('invalid')), 'invalid'],
    [(s) => s.drop(4000), 'ended'],
    [(s) => s.drop(4001), 'ended'],
    [(s) => s.drop(4009), 'ended'],
    [(s) => s.drop(4404), 'invalid'],
  ]) {
    const { sockets, viewer } = setup(t);
    sockets[0].open();
    send(sockets[0]);
    assert.equal(viewer.state, expected);
    t.mock.timers.reset();
  }
});

test('when the phone loses its connection it waits and reconnects every 2 s', (t) => {
  const { sockets, states, tick } = setup(t);
  sockets[0].open();
  sockets[0].message(buildStatus('live'));
  sockets[0].drop();
  assert.equal(states.at(-1), 'paused');
  tick(2000);
  assert.equal(sockets.length, 2);
  sockets[1].drop();
  tick(2000);
  assert.equal(sockets.length, 3);
  sockets[2].open();
  sockets[2].message(buildStatus('live'));
  assert.equal(states.at(-1), 'waiting');
});

test('a connection that stays down for 60 s ends the call on the page', (t) => {
  const { sockets, viewer, tick } = setup(t);
  sockets[0].open();
  sockets[0].drop();
  for (let i = 0; i < 40 && viewer.state !== 'ended'; i++) {
    const before = sockets.length;
    tick(2000);
    if (sockets.length > before) sockets.at(-1).drop();
  }
  assert.equal(viewer.state, 'ended');
  const count = sockets.length;
  tick(60_000);
  assert.equal(sockets.length, count);               // it stops trying
});

test('a heartbeat goes out every 30 s', (t) => {
  const { sockets, tick } = setup(t);
  sockets[0].open();
  tick(60_000);
  assert.deepEqual(sockets[0].sent, ['ping', 'ping']);
});

// Review 2026-11-12: a page that showed "Call ended" kept its socket open, and words sent
// later still appeared under "Call ended".
test('once ended, the page stops listening: the socket is closed and later words are ignored', (t) => {
  const { sockets, states, captions, tick } = setup(t);
  const s = sockets[0];
  s.open();
  s.message(buildStatus('live'));
  s.message(buildStatus('paused'));
  tick(60_000);
  assert.equal(states.at(-1), 'ended');
  assert.equal(s.closed, true);
  s.message(buildStatus('live'));
  s.message(caption('c:agent:9:0', 'after the end'));
  assert.equal(states.at(-1), 'ended');
  assert.deepEqual(captions, []);
  tick(60_000);
  assert.equal(sockets.length, 1);
});
