// User Story 1 problems: no sound shared, sharing ended, no call sound, no internet
// (FR-005, FR-008, FR-016, FR-019, SC-005, SC-006).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

async function setupTab(clip = 'en') {
  const context = await browser.newContext();
  await serveFixtures(context);
  const wa = await openStandIn(context, clip);
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  return { context, wa, agent };
}

test('Entire screen without system audio shows the fix within 3 s (FR-005)', async () => {
  const b = await launchChrome('screen-no-audio');
  try {
    const context = await b.newContext();
    const agent = await openAgent(context);
    await agent.getByTestId('start').click();
    await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'E_NO_CALL_SOUND_SCREEN', { timeout: 3_000 });
    await expect(agent.getByTestId('status')).toHaveAttribute('data-state', 'ready');
    await expect(agent.getByTestId('start')).toBeVisible();
  } finally {
    await b.close();
  }
});

test('closing the shared tab stops listening within 2 s (FR-019)', async () => {
  const { context, wa, agent } = await setupTab();
  await wa.close();
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'I_SHARING_STOPPED', { timeout: 2_000 });
  await expect(agent.getByTestId('status')).toHaveText('Stopped');
  await expect(agent.getByTestId('start')).toBeVisible();
  await context.close();
});

test('no call sound for 20 s shows the hint; sound removes it (FR-008)', async () => {
  const { context, wa, agent } = await setupTab();
  const hint = agent.getByTestId('hint');
  await agent.waitForTimeout(15_000);
  await expect(hint).toBeHidden();
  await expect(hint).toBeVisible({ timeout: 10_000 });
  await expect(hint).toHaveAttribute('data-code', 'H_NO_CALL_SOUND');
  await wa.evaluate(() => window.playClip());
  await expect(hint).toBeHidden({ timeout: 5_000 });
  await context.close();
});

test('going offline pauses with a message; coming back resumes within 5 s (SC-005)', async () => {
  const { context, wa, agent } = await setupTab();
  await context.setOffline(true);
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'W_NO_INTERNET', { timeout: 5_000 });
  await expect(agent.getByTestId('status')).toHaveText('Paused: No internet');

  await context.setOffline(false);
  // A microphone warning may remain (no microphone in tests); the network warning must clear.
  await expect(agent.getByTestId('message')).not.toHaveAttribute('data-code', /W_NO_INTERNET/, { timeout: 5_000 });
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 5_000 });
  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="customer"]').first()).toBeVisible({ timeout: 5_000 });
  await context.close();
});
