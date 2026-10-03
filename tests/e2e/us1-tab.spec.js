// User Story 1 through a shared Chrome tab (WhatsApp Web stand-in): customer speech
// becomes live Customer lines (FR-003, FR-004, FR-009 to FR-014, FR-020, SC-002).
import { test, expect } from '@playwright/test';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

async function setup({ clip = 'en', customerLang = 'en-US', query = '' } = {}) {
  const context = await browser.newContext();
  await serveFixtures(context);
  const wa = await openStandIn(context, clip);
  const agent = await openAgent(context, query);
  await agent.getByTestId('customer-lang').selectOption(customerLang);
  return { context, wa, agent };
}

async function startListening(agent) {
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
}

const customer = (agent) => agent.locator('[data-testid="line"][data-side="customer"]');
const finalCustomer = (agent) => agent.locator('[data-testid="line"][data-side="customer"][data-final="true"]');

async function trackMaxCallLevel(agent) {
  await agent.evaluate(() => {
    window.__maxCallLevel = 0;
    setInterval(() => {
      const v = Number(document.querySelector('[data-testid="meter-call"]').dataset.level);
      if (v > window.__maxCallLevel) window.__maxCallLevel = v;
    }, 50);
  });
}

test('Urdu customer speech appears as right-to-left Customer lines within 2 s', async () => {
  const { context, wa, agent } = await setup({ clip: 'ur', customerLang: 'ur-PK' });
  await startListening(agent);
  await trackMaxCallLevel(agent);

  const t0 = Date.now();
  await wa.evaluate(() => window.playClip());
  await expect(customer(agent).first()).toBeVisible({ timeout: 2_000 });       // SC-002
  test.info().annotations.push({ type: 'first-words-ms', description: String(Date.now() - t0) });

  // FR-004: the call keeps playing for the agent, unmuted, and capture does not suppress it.
  const playing = await wa.evaluate(() => window.clipState());
  expect(playing.paused).toBe(false);
  expect(playing.muted).toBe(false);
  const suppress = await agent.evaluate(
    () => window.__lct.state.capture.audioTrack.getSettings().suppressLocalAudioPlayback);
  expect(suppress).not.toBe(true);

  await expect(finalCustomer(agent).filter({ hasText: /کرولا|کراچی/ }).first()).toBeVisible({ timeout: 20_000 });
  await expect(customer(agent).first()).toHaveAttribute('dir', 'rtl');        // FR-014
  await expect(customer(agent).first().locator('.who')).toHaveText('Customer');
  await expect(agent.locator('[data-testid="line"][data-side="customer"][data-final="false"]'))
    .toHaveCount(0, { timeout: 15_000 });                                       // FR-011
  const texts = await customer(agent).locator('.text').allTextContents();
  expect(new Set(texts).size).toBe(texts.length);

  expect(await agent.evaluate(() => window.__maxCallLevel)).toBeGreaterThan(0); // FR-007
  await context.close();
});

test('English customer speech appears as Customer lines', async () => {
  const { context, wa, agent } = await setup({ clip: 'en', customerLang: 'en-US' });
  await startListening(agent);
  await wa.evaluate(() => window.playClip());
  await expect(finalCustomer(agent).filter({ hasText: /corolla|karachi/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(customer(agent).first()).toHaveAttribute('dir', 'ltr');
  await context.close();
});

test('switching the customer language mid-call applies to the next words (FR-012)', async () => {
  const { context, wa, agent } = await setup({ clip: 'ur', customerLang: 'en-US' });
  await startListening(agent);
  await agent.getByTestId('customer-lang').selectOption('ur-PK');
  await agent.waitForTimeout(500);
  await wa.evaluate(() => window.playClip());
  await expect(agent.locator('[data-testid="line"][data-side="customer"][dir="rtl"]').first())
    .toBeVisible({ timeout: 3_000 });
  await context.close();
});

test('Stop keeps the text; a new Start asks first, then starts fresh (FR-018, FR-020 amended)', async () => {
  const { context, wa, agent } = await setup({ clip: 'en', customerLang: 'en-US' });
  await startListening(agent);
  await wa.evaluate(() => window.playClip());
  await expect(customer(agent).first()).toBeVisible({ timeout: 5_000 });

  await agent.getByTestId('stop').click();
  await expect(agent.getByTestId('status')).toHaveText('Stopped');
  await expect(agent.getByTestId('start')).toBeVisible();
  expect(await customer(agent).count()).toBeGreaterThan(0);

  await agent.getByTestId('start').click();
  await agent.getByTestId('dialog-discard').click();       // the chat was not saved (User Story 4)
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await expect(agent.getByTestId('call-section')).toHaveCount(1);
  await expect(agent.getByTestId('call-section').locator('.call-time')).toContainText('Call started');
  await expect(customer(agent)).toHaveCount(0);
  await context.close();
});

test('the view follows new text only while it is at the bottom (FR-010)', async () => {
  const context = await browser.newContext();
  const agent = await openAgent(context);
  await agent.evaluate(() => { for (let i = 0; i < 50; i++) window.__lct.addSyntheticLine(`line ${i}`); });
  const transcript = agent.getByTestId('transcript');
  const atBottom = () => transcript.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 40);

  expect(await atBottom()).toBe(true);
  await transcript.evaluate((el) => { el.scrollTop = 0; });
  await agent.evaluate(() => window.__lct.addSyntheticLine('new line while reading'));
  expect(await transcript.evaluate((el) => el.scrollTop)).toBe(0);

  await transcript.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await agent.evaluate(() => window.__lct.addSyntheticLine('new line at the bottom'));
  expect(await atBottom()).toBe(true);
  await context.close();
});
