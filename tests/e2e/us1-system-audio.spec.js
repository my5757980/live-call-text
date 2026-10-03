// User Story 1 through "Entire screen + Also share system audio" (WhatsApp Desktop /
// installed dialer). A separate process plays a quiet clip through the laptop speakers.
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openAgent } from './helpers/chrome.js';
import { playThroughSpeakers } from './helpers/system-audio.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('screen'); });
test.afterAll(async () => { await browser?.close(); });

for (const { name, wav, lang, keywords } of [
  { name: 'English', wav: 'tests/fixtures/audio/en-quiet.wav', lang: 'en-US', keywords: /corolla|karachi/i },
  { name: 'Urdu', wav: 'tests/fixtures/audio/ur-quiet.wav', lang: 'ur-PK', keywords: /کرولا|کراچی/ },
]) {
  test(`${name} played through the laptop sound appears as Customer lines`, async () => {
    const context = await browser.newContext();
    await serveFixtures(context);
    const agent = await openAgent(context);   // the quiet clip is raised by the page's own AGC
    await agent.getByTestId('customer-lang').selectOption(lang);
    await agent.getByTestId('start').click();
    await expect(agent.getByTestId('status')).toHaveText("Listening to the laptop's sound", { timeout: 15_000 });

    await playThroughSpeakers(wav);
    await expect(agent.locator('[data-testid="line"][data-side="customer"]').filter({ hasText: keywords }).first())
      .toBeVisible({ timeout: 15_000 });
    await agent.getByTestId('stop').click();
    await context.close();
  });
}
