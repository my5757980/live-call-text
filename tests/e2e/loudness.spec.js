// Soft and loud speech on both sides (owner's request, 2026-10-03): the words must still
// come through. The clips are the test sentences at -20 dB (soft) and +12 dB with a limiter (loud).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

const REF = {
  'en-US': 'hello i want the price of a 2018 toyota corolla how many days will shipping to karachi take',
  'ur-PK': 'السلام علیکم مجھے ٹویوٹا کرولا کی قیمت چاہیے گاڑی کراچی کتنے دن میں پہنچے گی',
};
const words = (s) => s.toLowerCase().replace(/[.,!?؟،۔]/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  .split(/\s+/).filter(Boolean);
const score = (text, lang) => {
  const got = new Set(words(text));
  const ref = words(REF[lang]);
  return ref.filter((w) => got.has(w)).length / ref.length;
};

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

for (const { side, clip, lang, min } of [
  { side: 'customer', clip: 'en-soft', lang: 'en-US', min: 0.85 },
  { side: 'customer', clip: 'ur-soft', lang: 'ur-PK', min: 0.85 },
  { side: 'customer', clip: 'en-loud', lang: 'en-US', min: 0.8 },   // the loud clip is clipped by its limiter
  { side: 'agent', clip: 'en-soft', lang: 'en-US', min: 0.85 },
  { side: 'agent', clip: 'ur-loud', lang: 'ur-PK', min: 0.8 },
]) {
  test(`${side} side, ${clip}: at least ${min * 100}% of the words`, async () => {
    const context = await browser.newContext();
    await serveFixtures(context);
    await installStandInMic(context, { clip, mode: 'clip' });
    const wa = await openStandIn(context, clip);
    const agent = await openAgent(context);
    await agent.getByTestId('customer-lang').selectOption(lang);
    await agent.getByTestId('agent-lang').selectOption(lang);
    await agent.getByTestId('start').click();
    await expect(agent.getByTestId('meter-mic')).toHaveAttribute('data-state', 'on', { timeout: 15_000 });
    await agent.waitForTimeout(1000);
    if (side === 'customer') await wa.evaluate(() => window.playClip());
    else await agent.evaluate(() => { window.__playMic(); });

    const finals = agent.locator(`[data-testid="line"][data-side="${side}"][data-final="true"]`);
    await expect(finals.first()).toBeVisible({ timeout: 20_000 });
    await agent.waitForTimeout(4000);
    const text = (await finals.locator('.text').allTextContents()).join(' ');
    const got = score(text, lang);
    test.info().annotations.push({ type: 'words', description: `${Math.round(got * 100)}% | ${text}` });
    expect(got, text).toBeGreaterThanOrEqual(min);
    await context.close();
  });
}
