import { defineConfig, devices } from '@playwright/test';

/**
 * The app stack (web :3000, api :4000) is started separately via docker compose.
 * We do NOT use Playwright's webServer to launch it.
 */
export const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './tests',
  // Each spec seeds/cleans its own data via the API, so files run in parallel safely.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: WEB_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
