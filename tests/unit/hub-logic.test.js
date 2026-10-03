import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideAgentUpgrade, decideViewerJoin, onAgentFrame, onAgentClose, parseUpgrade, CLOSE,
  MAX_VIEWERS, MAX_FRAMES_PER_SEC,
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

test('agent close: clean means ended, unclean means paused, replaced or ended is ignored', () => {
  assert.equal(onAgentClose({ code: 1000, attachment: fresh() }), 'ended');
  assert.equal(onAgentClose({ code: 1001, attachment: fresh() }), 'ended');
  assert.equal(onAgentClose({ code: 1006, attachment: fresh() }), 'paused');
  assert.equal(onAgentClose({ code: 4010, attachment: { ...fresh(), replaced: true } }), 'ignore');
  assert.equal(onAgentClose({ code: 1000, attachment: { ...fresh(), ended: true } }), 'ignore');
});
