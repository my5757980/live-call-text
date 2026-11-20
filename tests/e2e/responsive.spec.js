// Responsive layout (FR-037 amended 2026-11-20): every page works from a 320 px phone to a
// 4K screen, in portrait and landscape. Nothing may stick out sideways, the conversation
// keeps a usable height, and big screens get bigger text.
import { test, expect } from '@playwright/test';
import { launchChrome, BASE } from './helpers/chrome.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

const SIZES = [
  [320, 568], [360, 640], [390, 844], [414, 896],          // phones, portrait
  [568, 320], [667, 375], [740, 360],                       // phones, landscape
  [683, 657], [768, 1024], [1024, 768],                     // half a laptop screen, tablets
  [1280, 720], [1366, 657], [1440, 900],                    // laptops (1366 x 768 minus Chrome's bars)
  [1920, 1080], [2560, 1440], [3840, 2160],                 // monitors
];

// The worst case the agent page can show at once: both banners, long lines, a live link.
async function fillAgent(page) {
  await page.evaluate(() => {
    const l = window.__lct;
    l.render.renderStatus(l.el.status, { state: 'listening', source: 'screen' });
    l.render.renderMessage(l.el.message, 'W_MIC_BLOCKED');
    l.render.renderHint(l.el.hint, true);
    l.addSyntheticLine('Hello, I want to know the price of the 2018 Toyota Corolla, and how many days shipping to Karachi will take.');
    l.transcript.applyResult({ callId: 'call-test', side: 'agent', session: 1, resultIndex: 900, text: 'جی بالکل، گاڑی دستیاب ہے اور کراچی تک ایک ہفتہ لگے گا۔', final: true, lang: 'ur-PK', at: Date.now() })
      .changed.forEach((x) => l.render.renderLine(l.el.transcript, x));
    l.addSyntheticLine(`https://example.com/a-very-long-link-without-any-spaces-${'x'.repeat(60)}`);
    l.el.linkStatus.dataset.state = 'live';
    l.el.linkStatus.dataset.url = `http://localhost:8787/v.html#${'Q'.repeat(22)}`;
    l.el.linkStatus.textContent = l.el.linkStatus.dataset.url;
  });
}

async function fillViewer(page) {
  await page.evaluate(() => {
    const st = document.querySelector('[data-testid="v-status"]');
    st.dataset.state = 'paused';
    st.querySelector('.en').textContent = 'Connection to the agent is weak, please wait...';
    st.querySelector('.ur').textContent = 'ایجنٹ سے رابطہ کمزور ہے، انتظار کریں...';
    const tr = document.querySelector('[data-testid="v-transcript"]');
    for (const [text, dir] of [
      ['Yes, it is available. The price is 4 million rupees and delivery to Karachi takes about one week.', 'ltr'],
      ['جی بالکل، گاڑی دستیاب ہے اور کراچی تک ایک ہفتہ لگے گا۔', 'rtl'],
      [`https://example.com/${'y'.repeat(80)}`, 'ltr'],
    ]) {
      const p = document.createElement('p');
      p.className = 'v-line';
      p.dataset.testid = 'v-line';
      p.dir = dir;
      const span = document.createElement('span');
      span.className = 'text';
      span.textContent = text;
      p.append(span);
      tr.append(p);
    }
  });
}

// Visible elements that stick out sideways, and scroll boxes that scroll sideways.
const sideways = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  if (document.documentElement.scrollWidth > vw + 1) bad.push(`page ${document.documentElement.scrollWidth}>${vw}`);
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('dialog:not([open])')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const name = el.dataset.testid ?? el.className ?? el.tagName;
    if (r.right > vw + 1 || r.left < -1) bad.push(`${name} ${Math.round(r.left)}..${Math.round(r.right)}`);
    if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) bad.push(`${name} scrolls sideways`);
  }
  return [...new Set(bad)];
});

const height = (page, testid) => page.getByTestId(testid).evaluate((el) => el.getBoundingClientRect().height);
const fontPx = (page, selector) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

for (const [w, h] of SIZES) {
  test(`${w}x${h}: agent page, customer page and guide fit the screen`, async () => {
    const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    const agent = await context.newPage();
    await agent.goto(`${BASE}/`);
    await fillAgent(agent);
    expect(await sideways(agent), 'agent page').toEqual([]);
    // The conversation is the reason for the page: it keeps a usable height everywhere.
    expect(await height(agent, 'transcript'), 'agent conversation height').toBeGreaterThanOrEqual(220);

    const viewer = await context.newPage();
    await viewer.goto(`${BASE}/v.html#x`);
    await fillViewer(viewer);
    expect(await sideways(viewer), 'customer page').toEqual([]);
    expect(await height(viewer, 'v-transcript'), 'customer text height').toBeGreaterThanOrEqual(Math.min(240, h * 0.5));

    const guide = await context.newPage();
    await guide.goto(`${BASE}/guide.html`);
    expect(await sideways(guide), 'guide').toEqual([]);
    await context.close();
  });
}

// The common laptop (1366 x 768, so 1366 x 657 inside Chrome). Even with both messages
// showing, Start, Copy customer link and the whole conversation are in view without any
// scrolling; with no message the conversation gets most of the screen.
test('on a laptop screen (1366 x 768) Start, the customer link and the conversation are in view without scrolling', async () => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  const agent = await context.newPage();
  await agent.goto(`${BASE}/`);
  await fillAgent(agent);
  const look = () => agent.evaluate(() => {
    const r = (id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
    return { start: r('start'), copy: r('copy-link'), transcript: r('transcript'), vh: innerHeight, scroll: document.documentElement.scrollHeight };
  });
  let view = await look();
  expect(view.scroll).toBeLessThanOrEqual(view.vh + 1);
  for (const id of ['start', 'copy', 'transcript']) expect(view[id].bottom, id).toBeLessThanOrEqual(view.vh);
  expect(view.transcript.height).toBeGreaterThanOrEqual(300);

  await agent.evaluate(() => {
    window.__lct.render.renderMessage(window.__lct.el.message, null);
    window.__lct.render.renderHint(window.__lct.el.hint, false);
  });
  view = await look();
  expect(view.transcript.height).toBeGreaterThanOrEqual(420);
  await context.close();
});

test('big screens get bigger text', async () => {
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const agent = await context.newPage();
  await agent.goto(`${BASE}/`);
  await fillAgent(agent);
  expect(await fontPx(agent, '[data-testid="line"]')).toBeGreaterThanOrEqual(26);
  const viewer = await context.newPage();
  await viewer.goto(`${BASE}/v.html#x`);
  await fillViewer(viewer);
  expect(await fontPx(viewer, '[data-testid="v-line"]')).toBeGreaterThanOrEqual(30);
  const guide = await context.newPage();
  await guide.goto(`${BASE}/guide.html`);
  expect(await fontPx(guide, '.doc li')).toBeGreaterThanOrEqual(18);
  await context.close();
});
