// User Story 4: save the call record and start fresh (FR-039, FR-040, SC-013).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { launchChrome, serveFixtures, openStandIn, openAgent } from './helpers/chrome.js';
import { installStandInMic } from './helpers/stand-in-mic.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

const customerFinal = (agent) =>
  agent.locator('[data-testid="line"][data-side="customer"][data-final="true"]').filter({ hasText: /corolla|karachi/i });

async function finishedCall() {
  const context = await browser.newContext();
  await serveFixtures(context);
  await installStandInMic(context, { clip: 'en', mode: 'clip' });   // a working, silent microphone
  const wa = await openStandIn(context, 'en');
  const agent = await openAgent(context);
  await agent.getByTestId('customer-lang').selectOption('en-US');
  await agent.getByTestId('agent-lang').selectOption('en-US');
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await wa.evaluate(() => window.playClip());
  await expect(customerFinal(agent).first()).toBeVisible({ timeout: 20_000 });
  await agent.getByTestId('stop').click();
  await expect(agent.getByTestId('status')).toHaveText('Stopped');
  return { context, wa, agent };
}

async function saveVia(agent, testid) {
  const [download] = await Promise.all([agent.waitForEvent('download'), agent.getByTestId(testid).click()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), 'utf8') };
}

test('Save chat downloads the call record; New call then starts empty', async () => {
  const { context, agent } = await finishedCall();
  await expect(agent.getByTestId('new-call')).toBeEnabled();

  const file = await saveVia(agent, 'save-chat');
  expect(file.name).toMatch(/^call-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.txt$/);
  expect(file.text).toContain('Live Call Text - call record');
  expect(file.text).toContain('Customer language: English');
  expect(file.text).toMatch(/\[\d{2}:\d{2}:\d{2}\] Customer: .*(corolla|karachi)/i);
  await expect(agent.getByTestId('message')).toHaveAttribute('data-code', 'I_CHAT_SAVED');
  await expect(agent.getByTestId('save-chat')).toContainText('Saved');

  await agent.getByTestId('new-call').click();
  await expect(agent.getByTestId('unsaved-dialog')).toBeHidden();
  await expect(agent.getByTestId('call-section')).toHaveCount(0);
  await expect(agent.locator('.empty-state')).toBeVisible();
  await expect(agent.getByTestId('save-chat')).toBeDisabled();
  await expect(agent.getByTestId('new-call')).toBeDisabled();
  await context.close();
});

test('New call with an unsaved chat asks first: Cancel keeps it, Don\'t save clears it', async () => {
  const { context, agent } = await finishedCall();
  await agent.getByTestId('new-call').click();
  await expect(agent.getByTestId('unsaved-dialog')).toBeVisible();
  await agent.getByTestId('dialog-cancel').click();
  await expect(agent.getByTestId('unsaved-dialog')).toBeHidden();
  await expect(customerFinal(agent).first()).toBeVisible();

  await agent.getByTestId('new-call').click();
  await agent.getByTestId('dialog-discard').click();
  await expect(agent.getByTestId('call-section')).toHaveCount(0);
  await expect(agent.locator('[data-testid="line"]')).toHaveCount(0);
  await context.close();
});

test('Start with an unsaved chat: Save and continue saves, then a fresh call starts', async () => {
  const { context, wa, agent } = await finishedCall();
  await agent.getByTestId('start').click();
  await expect(agent.getByTestId('unsaved-dialog')).toBeVisible();
  const file = await saveVia(agent, 'dialog-save');
  expect(file.text).toMatch(/Customer: .*(corolla|karachi)/i);

  await expect(agent.getByTestId('status')).toHaveText('Listening to a browser tab', { timeout: 15_000 });
  await expect(agent.getByTestId('call-section')).toHaveCount(1);
  await expect(agent.locator('[data-testid="line"]')).toHaveCount(0);     // nothing from the last call
  await wa.evaluate(() => window.playClip());
  await expect(customerFinal(agent).first()).toBeVisible({ timeout: 20_000 });
  await context.close();
});
