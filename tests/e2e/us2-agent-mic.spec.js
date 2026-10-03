// User Story 2: the agent's own microphone becomes Agent lines, in the agent's language,
// in time order with the Customer lines (FR-009, FR-012, FR-014, FR-007).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

const lines = (agent, side) => agent.locator(`[data-testid="line"][data-side="${side}"]`);

test('agent Urdu and customer English appear as separate, ordered lines', async () => {
  const context = await browser.newContext();
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'ur', mode: 'clip' });
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('agent-lang').selectOption('ur-PK');
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 10_000 });

  await agent.evaluate(() => {
    window.__maxMic = 0;
    setInterval(() => {
      const v = Number(document.querySelector('[data-testid="meter-mic"]').dataset.level);
      if (v > window.__maxMic) window.__maxMic = v;
    }, 50);
    window.__playMic();
  });
  await wa.evaluate(() => window.playClip());

  const agentFinal = lines(agent, 'agent').and(agent.locator('[data-final="true"]'));
  await expect(agentFinal.filter({ hasText: /کرولا|کراچی/ }).first()).toBeVisible({ timeout: 25_000 });
  await expect(lines(agent, 'agent').first()).toHaveAttribute('dir', 'rtl');
  await expect(lines(agent, 'agent').first().locator('.who')).toHaveText('Agent');
  await expect(lines(agent, 'customer').and(agent.locator('[data-final="true"]'))
    .filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 25_000 });

  // Without a headset the customer's voice from the speakers reaches the microphone.
  // "all" asks Chrome (141+) to remove all system playout from the mic, not only its own.
  expect(await agent.evaluate(() => window.__micConstraints.audio.echoCancellation)).toBe('all');

  const at = await agent.locator('[data-testid="line"]').evaluateAll((els) => els.map((e) => Number(e.dataset.at)));
  expect(at).toEqual([...at].sort((a, b) => a - b));                          // time order (FR-010)
  expect(await agent.evaluate(() => window.__maxMic)).toBeGreaterThan(0);       // FR-007
  await context.close();
});

test('switching my language mid-call applies to my next words (FR-012)', async () => {
  const context = await browser.newContext();
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });
  await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('agent-lang').selectOption('ur-PK');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 15_000 });
  await agent.getByTestId('agent-lang').selectOption('en-US');
  await agent.waitForTimeout(500);
  await agent.evaluate(() => { window.__playMic('en'); });
  await expect(lines(agent, 'agent').and(agent.locator('[dir="ltr"]')).first()).toBeVisible({ timeout: 3_000 });
  await context.close();
});
