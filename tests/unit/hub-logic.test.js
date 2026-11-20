import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideAgentUpgrade, decideViewerJoin, onAgentFrame, onAgentClose, parseUpgrade, CLOSE,
  MAX_VIEWERS, MAX_FRAMES_PER_SEC, FLOOD_FRAMES_PER_SEC, MAX_VIEWER_STRIKES,
  isAgentLive, onViewerFrame, checkWsRequest,
} from '../../relay/src/hub-logic.js';
import { MAX_AGE_MS } from '../../web/js/core/link-session.js';
import { buildCaption, buildEnd } from '../../web/js/core/protocol.js';

const V = { token: 'A'.repeat(43), created: 1767225600000, sid: 'OAt2jsCx_hA_81vUDXyTse' };
const agentUrl = (sid = V.sid) => `https://lct.example/ws?role=agent&sid=${sid}`;
const protocols = (token = V.token, created = V.created) => `lct1, auth.${token}.${created}`;

test('close codes follow the contract', () => {
  assert.deepEqual(CLOSE, {
    NORMAL: 1000, ENDED: 4000, EXPIRED: 4001, BAD_FRAMES: 4008, TOO_MANY_VIEWERS: 4009,
    REPLACED: 4010, INVALID: 4404,
  });
  assert.equal(MAX_VIEWERS, 5);
  assert.equal(MAX_FRAMES_PER_SEC, 5);
});

test('parseUpgrade reads role and sid', () => {
  assert.deepEqual(parseUpgrade(agentUrl()), { role: 'agent', sid: V.sid });
});

test('agent upgrade: a good token is accepted with protocol lct1', async () => {
  assert.deepEqual(await decideAgentUpgrade({ url: agentUrl(), protocols: protocols(), now: V.created + 5000 }),
    { ok: true, protocol: 'lct1', sid: V.sid, created: V.created });
});

test('agent upgrade: wrong token, old link, missing auth or bad sid are refused', async () => {
  const now = V.created + 5000;
  assert.equal((await decideAgentUpgrade({ url: agentUrl(), protocols: protocols('B'.repeat(43)), now })).status, 403);
  assert.equal((await decideAgentUpgrade({ url: agentUrl(), protocols: protocols(), now: V.created + MAX_AGE_MS + 1 })).status, 403);
  assert.equal((await decideAgentUpgrade({ url: agentUrl(), protocols: 'lct1', now })).status, 403);
  assert.equal((await decideAgentUpgrade({ url: agentUrl('short'), protocols: protocols(), now })).status, 400);
  assert.equal((await decideAgentUpgrade({ url: agentUrl(), protocols: `auth.${V.token}.${V.created}`, now })).status, 400);
});

test('viewer join: live, invalid, or too many viewers', () => {
  assert.deepEqual(decideViewerJoin({ liveAgent: true, viewerCount: 4 }), { send: 'live' });
  assert.deepEqual(decideViewerJoin({ liveAgent: false, viewerCount: 0 }), { send: 'invalid', close: CLOSE.INVALID });
  assert.deepEqual(decideViewerJoin({ liveAgent: true, viewerCount: 5 }), { close: CLOSE.TOO_MANY_VIEWERS });
});

const fresh = () => ({ role: 'agent', sid: V.sid, created: V.created, windowStart: 0, count: 0, drops: 0 });
const caption = (i) => buildCaption({ id: `c:agent:1:${i}`, text: `words ${i}`, final: true, lang: 'en-US' });

test('agent frames: valid captions are forwarded unchanged', () => {
  const r = onAgentFrame({ frame: caption(0), attachment: fresh(), now: V.created + 1000 });
  assert.equal(r.forward, caption(0));
});

test('agent frames: invalid ones are dropped, the 3rd drop closes with 4008', () => {
  let a = fresh();
  const now = V.created + 1000;
  let r = onAgentFrame({ frame: 'junk', attachment: a, now });
  assert.ok(r.drop && !r.close);
  a = r.attachment;
  r = onAgentFrame({ frame: 'junk', attachment: a, now: now + 1001 });
  assert.ok(r.drop && !r.close);
  a = r.attachment;
  r = onAgentFrame({ frame: 'junk', attachment: a, now: now + 2002 });
  assert.equal(r.close, CLOSE.BAD_FRAMES);
});

test('agent frames: more than 5 per second are dropped', () => {
  let a = fresh();
  const now = V.created + 1000;
  const outcomes = [];
  for (let i = 0; i < 7; i++) {
    const r = onAgentFrame({ frame: caption(i), attachment: a, now: now + i });
    a = r.attachment;
    outcomes.push(r.forward ? 'fwd' : r.drop);
  }
  assert.deepEqual(outcomes, ['fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'rate', 'rate']);
  const later = onAgentFrame({ frame: caption(9), attachment: a, now: now + 1000 });
  assert.ok(later.forward);
});

test('agent frames: end ends the call; anything after 4 h expires it', () => {
  assert.equal(onAgentFrame({ frame: buildEnd(), attachment: fresh(), now: V.created + 1000 }).end, true);
  assert.equal(onAgentFrame({ frame: caption(0), attachment: fresh(), now: V.created + MAX_AGE_MS + 1 }).expired, true);
});

// Review 2026-11-12 (B12): keep strangers from using up the relay's free allowance.
test('a call is live only while its agent is not replaced, not ended and under 4 hours old', () => {
  const now = V.created + 1000;
  assert.equal(isAgentLive(fresh(), now), true);
  assert.equal(isAgentLive(fresh(), V.created + MAX_AGE_MS), true);
  assert.equal(isAgentLive(fresh(), V.created + MAX_AGE_MS + 1), false);   // FR-029: no new viewers after 4 h
  assert.equal(isAgentLive({ ...fresh(), replaced: true }, now), false);
  assert.equal(isAgentLive({ ...fresh(), ended: true }, now), false);
  assert.equal(isAgentLive(null, now), false);
  assert.equal(isAgentLive({ role: 'viewer', sid: V.sid }, now), false);
});

test('a viewer that sends anything is closed on the third frame', () => {
  assert.equal(MAX_VIEWER_STRIKES, 3);
  let r = onViewerFrame({ attachment: { role: 'viewer', sid: V.sid } });
  assert.deepEqual([r.attachment.strikes, r.close], [1, undefined]);
  r = onViewerFrame({ attachment: r.attachment });
  assert.deepEqual([r.attachment.strikes, r.close], [2, undefined]);
  r = onViewerFrame({ attachment: r.attachment });
  assert.equal(r.close, CLOSE.BAD_FRAMES);
});

test('an agent socket that floods the relay is closed', () => {
  assert.equal(FLOOD_FRAMES_PER_SEC, 50);
  let a = fresh();
  const now = V.created + 1000;
  let last;
  for (let i = 0; i <= FLOOD_FRAMES_PER_SEC; i++) {
    last = onAgentFrame({ frame: caption(i), attachment: a, now: now + i });
    a = last.attachment;
    if (i < FLOOD_FRAMES_PER_SEC) assert.equal(last.close, undefined, `frame ${i + 1}`);
  }
  assert.equal(last.close, CLOSE.BAD_FRAMES);                                // the 51st frame in one second
});

test('requests are checked before the hub is woken: upgrade, role, sid and origin', () => {
  const url = `https://lct.example/ws?role=viewer&sid=${V.sid}`;
  const ok = { url, upgrade: 'websocket', origin: 'https://lct.example' };
  assert.deepEqual(checkWsRequest(ok), { ok: true });
  assert.deepEqual(checkWsRequest({ ...ok, upgrade: 'WebSocket' }), { ok: true });
  assert.deepEqual(checkWsRequest({ ...ok, origin: null }), { ok: true });       // not a browser
  assert.deepEqual(checkWsRequest({ ...ok, url: agentUrl(), origin: 'http://lct.example' }), { ok: true });
  assert.equal(checkWsRequest({ ...ok, upgrade: null }).status, 426);
  assert.equal(checkWsRequest({ ...ok, url: `https://lct.example/ws?role=boss&sid=${V.sid}` }).status, 400);
  assert.equal(checkWsRequest({ ...ok, url: 'https://lct.example/ws?role=viewer&sid=short' }).status, 400);
  assert.equal(checkWsRequest({ ...ok, origin: 'https://evil.example' }).status, 403);   // another website
  assert.equal(checkWsRequest({ ...ok, origin: 'null' }).status, 403);                   // a sandboxed page
});

test('agent close: clean means ended, unclean means paused, replaced or ended is ignored', () => {
  assert.equal(onAgentClose({ code: 1000, attachment: fresh() }), 'ended');
  assert.equal(onAgentClose({ code: 1001, attachment: fresh() }), 'ended');
  assert.equal(onAgentClose({ code: 1006, attachment: fresh() }), 'paused');
  assert.equal(onAgentClose({ code: 4010, attachment: { ...fresh(), replaced: true } }), 'ignore');
  assert.equal(onAgentClose({ code: 1000, attachment: { ...fresh(), ended: true } }), 'ignore');
});
