import { defineConfig } from '@playwright/test';

// Browsers are launched by tests/e2e/helpers/chrome.js (installed Google Chrome with
// per-test capture flags), so no browser projects are configured here.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:8787' },
  webServer: {
    command: 'npx wrangler dev --port 8787',
    url: 'http://localhost:8787',
    reuseExistingServer: true,
    timeout: 60_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
