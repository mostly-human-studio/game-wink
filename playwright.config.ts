import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (spec §10.4). Locally, PW_CHANNEL=chrome runs the Chromium leg on an
 * installed Chrome when the Playwright browsers can't be downloaded.
 */
const channel = process.env['PW_CHANNEL'];

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0, // a determinism failure must never be retried into a pass
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:5199' },
  webServer: {
    command: 'npx vite --port 5199 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
