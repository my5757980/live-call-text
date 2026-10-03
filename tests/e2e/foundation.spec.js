// Foundation: the agent page shell, fixed texts, remembered languages and the
// browser check (FR-001, FR-013, FR-021, FR-023, FR-035).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { launchChrome, serveFixtures, openAgent } from './helpers/chrome.js';

const contract = readFileSync('specs/001-live-call-text/contracts/ui-contract.md', 'utf8');
const agentTable = contract.split('## Agent page')[1].split('## Customer page')[0];
// Skip the table header, and call-section / line, which only exist once a call has text.
const AGENT_IDS = [...agentTable.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1])
  .filter((id) => !['data-testid', 'call-section', 'line'].includes(id));
const HEADSET = contract.match(/- Headset reminder: "(.+)"/)[1];
const PRIVACY = contract.match(/- Privacy line: "(.+)"/)[1];

const fakeBrand = (brand, version) => `
  Object.defineProperty(Navigator.prototype, 'userAgentData', {
    configurable: true,
    get() { return { brands: [{ brand: 'Chromium', version: '${version}' },
      { brand: '${brand}', version: '${version}' }], mobile: false }; },
  });`;

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

async function newAgent(initScript) {
  const context = await browser.newContext();
  await serveFixtures(context);
  if (initScript) await context.addInitScript(initScript);
  const page = await openAgent(context);
  return { context, page };
}

test('the agent page has every element from the UI contract', async () => {
  const { context, page } = await newAgent();
  expect(AGENT_IDS.length).toBeGreaterThanOrEqual(14);
  for (const id of AGENT_IDS) {
    await expect(page.locator(`[data-testid="${id}"]`), id).toHaveCount(1);
  }
  await context.close();
});

test('headset reminder, privacy line and Ready state are shown', async () => {
  const { context, page } = await newAgent();
  await expect(page.getByTestId('headset-reminder')).toHaveText(HEADSET);
  await expect(page.getByTestId('privacy-line')).toHaveText(PRIVACY);
  await expect(page.getByTestId('start')).toBeEnabled();
  await expect(page.getByTestId('stop')).toBeHidden();
  await expect(page.getByTestId('status')).toHaveText('Ready');
  await expect(page.getByTestId('status')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('copy-link')).toBeDisabled();
  await expect(page.getByTestId('help-link')).toHaveAttribute('href', 'guide.html');
  await context.close();
});

test('language choices survive a reload (FR-013)', async () => {
  const { context, page } = await newAgent();
  await expect(page.getByTestId('customer-lang')).toHaveValue('en-US');
  await page.getByTestId('customer-lang').selectOption('ur-PK');
  await page.getByTestId('agent-lang').selectOption('ur-PK');
  await page.reload();
  await expect(page.getByTestId('customer-lang')).toHaveValue('ur-PK');
  await expect(page.getByTestId('agent-lang')).toHaveValue('ur-PK');
  await context.close();
});

test('another browser brand is refused with E_NOT_CHROME', async () => {
  const { context, page } = await newAgent(fakeBrand('Microsoft Edge', '154'));
  await expect(page.getByTestId('message')).toHaveAttribute('data-code', 'E_NOT_CHROME');
  await expect(page.getByTestId('start')).toBeDisabled();
  await context.close();
});

test('an old Chrome is refused with E_OLD_CHROME', async () => {
  const { context, page } = await newAgent(fakeBrand('Google Chrome', '120'));
  await expect(page.getByTestId('message')).toHaveAttribute('data-code', 'E_OLD_CHROME');
  await expect(page.getByTestId('start')).toBeDisabled();
  await context.close();
});
