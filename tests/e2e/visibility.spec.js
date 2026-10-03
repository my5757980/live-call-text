// R11: does recognition keep running while the agent page is hidden (minimised)?
//
// FINDING 2026-10-03 (test-log Finding 5): under Playwright on Chrome 154 the page reports
// visibilityState "visible" even when its window is minimised, with Playwright's
// backgrounding switches removed. So this cannot be measured automatically. It is checked
// by hand in the real-call checklist instead (quickstart.md §5A step 10), and the guide
// tells agents to keep the page in its own visible window. The test stays as fixme so it
// runs again if Playwright's behaviour changes.
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

test.fixme('customer captions keep arriving while the agent page is hidden', async () => {
  const browser = await launchChrome('tab', [], { headless: false, realBackgrounding: true });
  try {
    const context = await browser.newContext();
    await serveFixtures(context);
    await installStandInMic(context, { clip: 'en', mode: 'clip' });
    const wa = await openStandIn(context, 'en');
    const agent = await openAgent(context);
    await agent.bringToFront();
    await agent.getByTestId('start').click();
    await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });

    // Playwright opens pages as separate windows, so hide the agent page the way an agent
    // would: by minimising its window.
    const cdp = await context.newCDPSession(agent);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
    await expect.poll(() => agent.evaluate(() => document.visibilityState)).toBe('hidden');

    await wa.evaluate(() => window.playClip());
    await expect(agent.locator('[data-testid="line"][data-side="customer"]').filter({ hasText: /corolla|karachi/i }).first())
      .toBeAttached({ timeout: 20_000 });
  } finally {
    await browser.close();
  }
});
