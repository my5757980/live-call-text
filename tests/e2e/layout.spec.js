// Look and feel (FR-037): no horizontal scrolling at half-screen / phone widths, dark
// theme support, and readable contrast in both themes.
import { test, expect } from '@playwright/test';
import { launchChrome, openAgent, BASE } from './helpers/chrome.js';

let browser;
test.beforeAll(async () => { browser = await launchChrome('tab'); });
test.afterAll(async () => { await browser?.close(); });

const LONG = 'A very long sentence without breaks: https://example.com/'.concat('x'.repeat(160));

async function fillAgent(page) {
  await page.evaluate((long) => {
    const l = window.__lct;
    l.addSyntheticLine(long);
    const t = l.transcript;
    t.applyResult({ callId: 'call-test', side: 'agent', session: 1, resultIndex: 999, text: 'السلام علیکم، جی بالکل۔', final: true, lang: 'ur-PK', at: Date.now() })
      .changed.forEach((x) => l.render.renderLine(l.el.transcript, x));
    l.el.linkStatus.dataset.state = 'live';
    l.el.linkStatus.textContent = `http://localhost:8787/v.html#${'Q'.repeat(22)}`;
  }, LONG);
}

async function fillViewer(page) {
  await page.evaluate((long) => {
    const tr = document.querySelector('[data-testid="v-transcript"]');
    for (const [text, dir] of [[long, 'ltr'], ['ایجنٹ کی بات یہاں لکھی آئے گی', 'rtl']]) {
      const p = document.createElement('p');
      p.className = 'v-line';
      p.dataset.testid = 'v-line';
      p.dir = dir;
      p.innerHTML = '<span class="text"></span>';
      p.firstChild.textContent = text;
      tr.append(p);
    }
  }, LONG);
}

const noHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('agent page fits a half-screen window (640 px) without horizontal scroll', async () => {
  const context = await browser.newContext({ viewport: { width: 640, height: 900 } });
  const page = await openAgent(context);
  await fillAgent(page);
  expect(await noHorizontalScroll(page)).toBe(true);
  await context.close();
});

test('customer page fits a phone (390 px) without horizontal scroll', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${BASE}/v.html#not-a-real-id`);
  await fillViewer(page);
  expect(await noHorizontalScroll(page)).toBe(true);
  await context.close();
});

// WCAG relative luminance contrast between two computed CSS colours.
function contrastIn(page, selector, bgSelector) {
  return page.evaluate(([sel, bgSel]) => {
    const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fg = rgb(getComputedStyle(document.querySelector(sel)).color);
    const bg = rgb(getComputedStyle(document.querySelector(bgSel)).backgroundColor);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  }, [selector, bgSelector]);
}

for (const colorScheme of ['light', 'dark']) {
  test(`${colorScheme} theme: readable contrast for captions and status`, async () => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1100, height: 900 } });
    const page = await openAgent(context);
    await fillAgent(page);
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const sum = bodyBg.match(/\d+/g).slice(0, 3).map(Number).reduce((a, b) => a + b, 0);
    expect(colorScheme === 'dark' ? sum < 150 : sum > 600).toBe(true);

    const checks = {
      customer: await contrastIn(page, '[data-side="customer"] .text', '[data-side="customer"]'),
      agent: await contrastIn(page, '[data-side="agent"] .text', '[data-side="agent"]'),
      status: await contrastIn(page, '[data-testid="status"]', '[data-testid="status"]'),
    };
    for (const [name, ratio] of Object.entries(checks)) {
      expect(ratio, `${name} contrast ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }

    const viewer = await context.newPage();
    await viewer.goto(`${BASE}/v.html#not-a-real-id`);
    await fillViewer(viewer);
    expect(await contrastIn(viewer, '.v-line .text', '.v-line')).toBeGreaterThanOrEqual(4.5);
    await context.close();
  });
}
