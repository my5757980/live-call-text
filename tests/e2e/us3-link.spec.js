// User Story 3: the optional customer link shows the agent's words live on the
// customer's phone, never the customer's own words (FR-024 to FR-031, SC-009, SC-011).
import { test, expect, devices } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent, BASE } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

async function setup({ routeRelay } = {}) {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });
  if (routeRelay) await context.routeWebSocket(/\/ws/, routeRelay);
  const wa = await openStandIn(context, 'ur');
  const agent = await openAgent(context);
  await agent.getByTestId('agent-lang').selectOption('en-US');
  await agent.getByTestId('customer-lang').selectOption('ur-PK');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 10_000 });
  return { context, wa, agent };
}

async function copyLink(agent) {
  await expect(agent.getByTestId('copy-link')).toBeEnabled();
  await agent.getByTestId('copy-link').click();
  await expect(agent.getByTestId('link-status')).toHaveAttribute('data-state', 'live', { timeout: 10_000 });
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'I_LINK_COPIED');
  const url = await agent.getByTestId('link-status').getAttribute('data-url');
  expect(url).toMatch(/\/v\.html#[A-Za-z0-9_-]{22}$/);
  expect(await agent.evaluate(() => navigator.clipboard.readText())).toBe(url);
  return url;
}

async function openCustomer(url) {
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await phone.newPage();
  await page.goto(url);
  return { phone, page };
}

test('the customer sees the agent words live; Stop ends the link (SC-009, FR-026, FR-028)', async () => {
  const { context, wa, agent } = await setup();
  const url = await copyLink(agent);
  const { phone, page } = await openCustomer(url);
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', /waiting|live/, { timeout: 10_000 });

  await agent.evaluate(() => { window.__playMic(); });
  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="agent"]').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('v-line').first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByTestId('v-line').filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', 'live');

  // FR-026: the customer's own (Urdu) words never reach the customer page.
  await expect(agent.locator('[data-testid="line"][data-side="customer"]').first()).toBeVisible({ timeout: 10_000 });
  expect((await page.getByTestId('v-line').allTextContents()).join(' ')).not.toMatch(/[؀-ۿ]/);

  await agent.getByTestId('stop').click();
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', 'ended', { timeout: 5_000 });
  await expect(agent.getByTestId('link-status')).toHaveAttribute('data-state', 'ended');
  await page.reload();
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', 'invalid', { timeout: 10_000 });
  await phone.close();
  await context.close();
});

test('closing the agent page ends the customer page within 5 s (FR-028)', async () => {
  const { context, agent } = await setup();
  const url = await copyLink(agent);
  const { phone, page } = await openCustomer(url);
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', /waiting|live/, { timeout: 10_000 });
  await agent.close();
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', 'ended', { timeout: 5_000 });
  await phone.close();
  await context.close();
});

test('if the link service is down, captions keep working (SC-011, FR-031)', async () => {
  const { context, wa, agent } = await setup({ routeRelay: (ws) => ws.close({ code: 1011, reason: 'down' }) });
  await agent.getByTestId('copy-link').click();
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'W_LINK_UNAVAILABLE', { timeout: 10_000 });
  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="customer"]').first()).toBeVisible({ timeout: 10_000 });
  await context.close();
});

test('a link that was never valid shows the invalid state without connecting', async () => {
  const { phone, page } = await openCustomer(`${BASE}/v.html#not-a-real-id`);
  await expect(page.getByTestId('v-status')).toHaveAttribute('data-state', 'invalid');
  await expect(page.getByTestId('v-status')).toContainText('یہ کال ختم ہو چکی ہے یا لنک درست نہیں ہے');
  await phone.close();
});
