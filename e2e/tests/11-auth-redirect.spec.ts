import { test, expect } from '@playwright/test';

/**
 * User story: protected routes require authentication.
 * The client-side RoleGate sends unauthenticated visitors to /login
 * (the backend Guards remain the authoritative boundary).
 *
 * Success criteria:
 *  - Visiting /concerts with no session redirects to /login.
 *  - Visiting /admin with no session redirects to /login.
 *  - Visiting /reservations with no session redirects to /login.
 */
test.describe('auth redirect for unauthenticated users', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a clean, session-less browser context.
    await page.goto('/login');
    await page.evaluate(() => window.localStorage.clear());
  });

  for (const path of ['/concerts', '/admin', '/reservations']) {
    test(`visiting ${path} without a session redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByTestId('login-submit')).toBeVisible();
    });
  }
});
