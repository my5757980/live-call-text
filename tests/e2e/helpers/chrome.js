// Launches the installed Google Chrome with the capture flags each test mode needs
// (research.md R9), and serves test fixtures under /__test/ without touching web/.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.resolve(here, '../../fixtures');
export const BASE = 'http://localhost:8787';

const BASE_ARGS = ['--autoplay-policy=no-user-gesture-required'];

const MODES = {
  // WhatsApp Web: Chrome picks the tab whose title contains "WhatsApp".
  tab: {
    headless: true,
    args: ['--auto-select-tab-capture-source-by-title=WhatsApp'],
  },
  // WhatsApp Desktop / installed dialer: entire screen with "Also share system audio" ticked.
  // T071 (2026-10-03, Chrome 154): only the underscore spelling of this switch works.
  screen: {
    headless: false,
    args: [
      '--auto-select-desktop-capture-source=Entire screen',
      '--system-audio-capture-default_checked',
    ],
  },
  // Same, but the agent "forgot" to tick system audio.
  'screen-no-audio': {
    headless: false,
    args: ['--auto-select-desktop-capture-source=Entire screen'],
  },
};

// Playwright normally stops Chrome from treating hidden pages as background pages.
// `realBackgrounding: true` restores normal Chrome behaviour for the visibility test (R11).
const BACKGROUNDING_DEFAULTS = [
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
];

export async function launchChrome(mode = 'tab', extraArgs = [], { headless, realBackgrounding = false } = {}) {
  const m = MODES[mode];
  if (!m) throw new Error(`Unknown launch mode: ${mode}`);
  let args = [...m.args];
  // T071: LCT_SYSTEM_AUDIO_FLAG picks one spelling of the checkbox switch.
  const only = process.env.LCT_SYSTEM_AUDIO_FLAG;
  if (only) args = args.filter((a) => !a.startsWith('--system-audio-capture-default') || a === only);
  return chromium.launch({
    channel: 'chrome',
    headless: headless ?? m.headless,
    args: [...BASE_ARGS, ...args, ...extraArgs],
    // Playwright mutes Chrome by default, which silences what tab/system capture hears.
    ignoreDefaultArgs: ['--mute-audio', ...(realBackgrounding ? BACKGROUNDING_DEFAULTS : [])],
  });
}

export async function serveFixtures(context) {
  await context.route('**/__test/**', async (route) => {
    const rel = new URL(route.request().url()).pathname.replace(/^\/__test\//, '');
    if (!/^(pages|audio)\/[\w.-]+$/.test(rel)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ path: path.join(FIXTURES, rel) });
  });
}

export async function openStandIn(context, clip = 'en') {
  const page = await context.newPage();
  await page.goto(`${BASE}/__test/pages/whatsapp-standin.html?clip=${clip}`);
  return page;
}

export async function openAgent(context, query = '') {
  const page = await context.newPage();
  await page.goto(`${BASE}/${query ? `?${query}` : ''}`);
  return page;
}
