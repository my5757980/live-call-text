// No headset: the customer's voice from the speakers reaches the microphone. The echo
// filter hides that copy on the agent page and never sends it to the customer link (FR-038).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent, BASE } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

test('the customer voice leaking into the mic is shown only as Customer', async () => {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });   // the mic hears the same clip (echo)
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('agent-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 15_000 });

  await agent.getByTestId('copy-link').click();
  await expect(agent.getByTestId('link-status')).toHaveAttribute('data-state', 'live', { timeout: 10_000 });
  const url = await agent.getByTestId('link-status').getAttribute('data-url');
  const phone = await browser.newContext();
  const viewer = await phone.newPage();
  await viewer.goto(url);
  await expect(viewer.getByTestId('v-status')).toHaveAttribute('data-state', /waiting|live/, { timeout: 10_000 });

  await Promise.all([
    wa.evaluate(() => window.playClip()),
    agent.evaluate(() => { window.__playMic(); }),
  ]);
  await expect(agent.locator('[data-testid="line"][data-side="customer"][data-final="true"]')
    .filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 20_000 });
  await agent.waitForTimeout(4_000);

  await expect(agent.locator('[data-testid="line"][data-side="agent"]').filter({ visible: true })).toHaveCount(0);
  expect(await agent.locator('[data-testid="line"][data-side="agent"][data-echo="true"]').count()).toBeGreaterThan(0);
  await expect(viewer.getByTestId('v-line')).toHaveCount(0);
  await phone.close();
  await context.close();
});

// Review 2026-11-12 (B1): echo reaches the microphone WHILE the customer speaks. An agent
// who says the customer's words back afterwards (to confirm a number, say) is not echo,
// and used to be hidden from the page, the saved chat and the customer link.
test('an agent who repeats the customer after they finish is shown, also on the customer link', async () => {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('agent-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 15_000 });
  await agent.getByTestId('copy-link').click();
  await expect(agent.getByTestId('link-status')).toHaveAttribute('data-state', 'live', { timeout: 10_000 });
  const phone = await browser.newContext();
  const viewer = await phone.newPage();
  await viewer.goto(await agent.getByTestId('link-status').getAttribute('data-url'));
  await expect(viewer.getByTestId('v-status')).toHaveAttribute('data-state', /waiting|live/, { timeout: 10_000 });

  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="customer"][data-final="true"]')
    .filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 20_000 });

  // The customer has finished; now the agent says the same sentence.
  await agent.evaluate(() => { window.__playMic(); });
  await expect(agent.locator('[data-testid="line"][data-side="agent"][data-final="true"]')
    .filter({ visible: true }).filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 25_000 });
  expect(await agent.locator('[data-testid="line"][data-side="agent"][data-echo="true"]').count()).toBe(0);
  await expect(viewer.getByTestId('v-line').filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 10_000 });
  await phone.close();
  await context.close();
});
