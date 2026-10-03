// Long-run check (proxy for SC-004): runs only when SOAK_MINUTES is set, for example
//   $env:SOAK_MINUTES=10; npx playwright test tests/e2e/soak.spec.js
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

const MINUTES = Number(process.env.SOAK_MINUTES || 0);

test.skip(!MINUTES, 'set SOAK_MINUTES to run the long-call check');

test(`captions keep working for ${MINUTES} minutes with no agent action`, async () => {
  test.setTimeout((MINUTES + 3) * 60_000);
  const browser = await launchChrome('tab');
  const context = await browser.newContext();
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });   // a working, silent microphone
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });

  const finals = agent.locator('[data-testid="line"][data-side="customer"][data-final="true"]');
  const ends = Date.now() + MINUTES * 60_000;
  let rounds = 0;
  while (Date.now() < ends) {
    const before = await finals.count();
    await wa.evaluate(() => window.playClip());
    await expect.poll(() => finals.count(), { timeout: 20_000 }).toBeGreaterThan(before);
    const code = await agent.getByTestId('message').getAttribute('data-code');
    expect(code === null || code.startsWith('I_'), `unexpected message ${code}`).toBe(true);
    rounds++;
    await agent.waitForTimeout(10_000);   // about one replay every 20 s
  }
  test.info().annotations.push({ type: 'rounds', description: String(rounds) });
  await browser.close();
});
