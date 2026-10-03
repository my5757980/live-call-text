// Relay integration: starts the Worker + hub Durable Object locally with `wrangler dev`
// (no Cloudflare account needed) and drives it with Node's WebSocket client
// (contracts/relay-protocol.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLinkSession } from '../../web/js/core/link-session.js';
import { buildCaption, buildEnd } from '../../web/js/core/protocol.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = 8788;
const HTTP = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server;

before(async () => {
  server = spawn(`npx wrangler dev --port ${PORT} --ip 127.0.0.1`, {
    cwd: ROOT, shell: true, stdio: 'ignore', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    try {
      const r = await fetch(`${HTTP}/`);
      if (r.status === 200) return;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('wrangler dev did not start within 90 s');
});

after(() => {
  try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
});

function open(url, protocols) {
  const ws = new WebSocket(url, protocols);
  const messages = [];
  ws.addEventListener('message', (e) => messages.push(e.data));
  const opened = new Promise((resolve) => {
    ws.addEventListener('open', () => resolve(true));
    ws.addEventListener('error', () => resolve(false));
  });
  const closed = new Promise((resolve) => ws.addEventListener('close', (e) => resolve({ code: e.code })));
  return { ws, messages, opened, closed };
}

async function waitFor(fn, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await sleep(25);
  }
  throw new Error('timed out waiting for condition');
}

const parse = (m) => { try { return JSON.parse(m); } catch { return null; } };
const hasStatus = (conn, state) => conn.messages.some((m) => parse(m)?.t === 'status' && parse(m)?.state === state);
const newSession = () => createLinkSession({ origin: HTTP });
const agent = (s) => open(`${WS}/ws?role=agent&sid=${s.sid}`, ['lct1', `auth.${s.token}.${s.created}`]);
const viewer = (sid) => open(`${WS}/ws?role=viewer&sid=${sid}`);
const caption = (id, text, final = true) => buildCaption({ id, text, final, lang: 'en-US' });

test('a valid agent connects and is told it is live', async () => {
  const a = agent(await newSession());
  assert.equal(await a.opened, true);
  await waitFor(() => hasStatus(a, 'live'));
  a.ws.close(1000);
});

test('a wrong token is refused before the upgrade', async () => {
  const s = await newSession();
  const a = agent({ ...s, token: 'B'.repeat(43) });
  assert.equal(await a.opened, false);
});

test('viewers get only captions sent after they joined, unchanged', async () => {
  const s = await newSession();
  const a = agent(s);
  await a.opened;
  await waitFor(() => hasStatus(a, 'live'));
  a.ws.send(caption('c:agent:1:0', 'before the viewer'));
  await sleep(300);
  const v = viewer(s.sid);
  assert.equal(await v.opened, true);
  await waitFor(() => hasStatus(v, 'live'));
  const frame = caption('c:agent:1:1', 'after the viewer');
  a.ws.send(frame);
  await waitFor(() => v.messages.includes(frame));
  assert.equal(v.messages.some((m) => m.includes('before the viewer')), false);
  a.ws.close(1000);
});

test('agent end sends ended and closes viewers with 4000', async () => {
  const s = await newSession();
  const a = agent(s);
  await a.opened;
  await waitFor(() => hasStatus(a, 'live'));
  const v = viewer(s.sid);
  await waitFor(() => hasStatus(v, 'live'));
  a.ws.send(buildEnd());
  await waitFor(() => hasStatus(v, 'ended'));
  assert.equal((await v.closed).code, 4000);
});

test('an unknown session is invalid and closed with 4404', async () => {
  const v = viewer('A'.repeat(22));
  await waitFor(() => hasStatus(v, 'invalid'));
  assert.equal((await v.closed).code, 4404);
});

test('a sixth viewer is closed with 4009', async () => {
  const s = await newSession();
  const a = agent(s);
  await a.opened;
  await waitFor(() => hasStatus(a, 'live'));
  const five = [];
  for (let i = 0; i < 5; i++) {
    const v = viewer(s.sid);
    await waitFor(() => hasStatus(v, 'live'));
    five.push(v);
  }
  const sixth = viewer(s.sid);
  assert.equal((await sixth.closed).code, 4009);
  a.ws.close(1000);
});

test('a reconnect with the same token replaces the old agent socket (4010); viewers stay live', async () => {
  const s = await newSession();
  const a1 = agent(s);
  await a1.opened;
  await waitFor(() => hasStatus(a1, 'live'));
  const v = viewer(s.sid);
  await waitFor(() => hasStatus(v, 'live'));
  const a2 = agent(s);
  assert.equal(await a2.opened, true);
  assert.equal((await a1.closed).code, 4010);
  await sleep(300);
  assert.equal(hasStatus(v, 'ended') || hasStatus(v, 'paused'), false);
  const frame = caption('c:agent:2:0', 'from the new socket');
  a2.ws.send(frame);
  await waitFor(() => v.messages.includes(frame));
  a2.ws.close(1000);
});

test('an oversized frame is dropped; the next valid one is forwarded', async () => {
  const s = await newSession();
  const a = agent(s);
  await a.opened;
  await waitFor(() => hasStatus(a, 'live'));
  const v = viewer(s.sid);
  await waitFor(() => hasStatus(v, 'live'));
  a.ws.send(caption('c:agent:1:0', 'x'.repeat(400)) + ' '.repeat(2700));
  const ok = caption('c:agent:1:1', 'small and valid');
  a.ws.send(ok);
  await waitFor(() => v.messages.includes(ok));
  assert.equal(v.messages.some((m) => m.includes('xxxx')), false);
  a.ws.close(1000);
});

test('ping is answered with pong', async () => {
  const a = agent(await newSession());
  await a.opened;
  a.ws.send('ping');
  await waitFor(() => a.messages.includes('pong'));
  a.ws.close(1000);
});
