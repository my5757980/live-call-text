// Polish: the Roman Urdu guide opens from the agent page, and caption text is large
// (FR-015, FR-022).
import { test, expect } from '@playwright/test';
import { launchChrome, openAgent, BASE } from './helpers/chrome.js';

const SECTIONS = [
  'Headset aur window set-up',
  'Browser wali WhatsApp',
  'Install wali WhatsApp ya dialer',
  'Customer link kaise bhejein',
  'Har message ka matlab',
  'Privacy',
];

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

test('the help link opens the guide with all six sections and the live message texts', async () => {
  const context = await browser.newContext();
  const agent = await openAgent(context);
  const [guide] = await Promise.all([context.waitForEvent('page'), agent.getByTestId('help-link').click()]);
  await guide.waitForLoadState();
  const headings = await guide.locator('h2').allTextContents();
  for (const title of SECTIONS) expect(headings.some((h) => h.includes(title)), title).toBe(true);
  await expect(guide.locator('[data-message-code="W_NO_INTERNET"]'))
    .toHaveText('No internet - captions paused. They will continue by themselves.');
  await context.close();
});

test('caption text is at least 22 px on the agent page and 24 px on the customer page (FR-015)', async () => {
  const context = await browser.newContext();
  const agent = await openAgent(context);
  await agent.evaluate(() => window.__lct.addSyntheticLine('Readable caption'));
  const agentPx = await agent.locator('[data-testid="line"]').first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(agentPx).toBeGreaterThanOrEqual(22);

  const viewer = await context.newPage();
  await viewer.goto(`${BASE}/v.html#not-a-real-id`);
  const viewerPx = await viewer.evaluate(() => {
    const p = document.createElement('p');
    p.className = 'v-line';
    p.dataset.testid = 'v-line';
    p.textContent = 'Readable caption';
    document.querySelector('[data-testid="v-transcript"]').append(p);
    return parseFloat(getComputedStyle(p).fontSize);
  });
  expect(viewerPx).toBeGreaterThanOrEqual(24);
  await context.close();
});
