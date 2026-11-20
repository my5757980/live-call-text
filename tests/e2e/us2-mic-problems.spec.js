// User Story 2 problems: a blocked or missing microphone shows its warning and never
// stops customer captions (FR-017, FR-021).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

for (const [mode, code] of [['denied', 'W_MIC_BLOCKED'], ['missing', 'W_MIC_MISSING']]) {
  test(`microphone ${mode}: ${code} shows and customer captions continue`, async () => {
    const context = await browser.newContext();
    await serveFixtures(context);
    await installStandInMic(context, { clip: 'en', mode });
    const wa = await openStandIn(context, 'en');
    const agent = await openAgent(context);
    await agent.getByTestId('customer-lang').selectOption('en-US');
    await agent.getByTestId('start').click();
    await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
    await expect(agent.getByTestId('message')).toHaveAttribute('data-code', code, { timeout: 5_000 });
    await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'unavailable');

    await wa.evaluate(() => window.playClip());
    await expect(agent.locator('[data-testid="line"][data-side="customer"]').filter({ hasText: /corolla|karachi/i }).first())
      .toBeVisible({ timeout: 20_000 });
    await expect(agent.locator('[data-testid="line"][data-side="agent"]')).toHaveCount(0);
    await context.close();
  });
}

// Review 2026-11-12 (B4): a headset unplugged during a call used to end the Agent side
// without a word. Now the page says so, customer captions go on, and the Agent side
// comes back by itself when a microphone is there again.
test('a microphone that goes away mid-call: warning, customer captions continue, and it comes back', async () => {
  const context = await browser.newContext();
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'ur', mode: 'clip' });
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('agent-lang').selectOption('ur-PK');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 10_000 });

  // The headset is unplugged: its track ends, and no other microphone can be opened.
  await agent.evaluate(() => {
    window.__micMode = 'missing';
    window.__micTrack.dispatchEvent(new Event('ended'));
  });
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'W_MIC_MISSING', { timeout: 3_000 });
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'unavailable');
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab');

  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="customer"]').filter({ hasText: /corolla|karachi/i }).first())
    .toBeVisible({ timeout: 20_000 });

  // Plugged in again: Chrome reports a device change.
  await agent.evaluate(() => {
    window.__micMode = 'clip';
    navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
  });
  await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 10_000 });
  await expect(agent.getByTestId('message')).not.toHaveAttribute('data-code', 'W_MIC_MISSING');
  await agent.evaluate(() => { window.__playMic(); });
  await expect(agent.locator('[data-testid="line"][data-side="agent"][dir="rtl"]').filter({ hasText: /کرولا|کراچی/ }).first())
    .toBeVisible({ timeout: 25_000 });
  await context.close();
});
