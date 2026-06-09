import { test, expect } from '@playwright/test';
import { freshUser, SEED_USER } from './helpers/api';

/**
 * User story: register/login + auth validation.
 * Success criteria:
 *  - Register a new user via the UI -> lands on the user home (/concerts).
 *  - Login as that user -> reaches /concerts.
 *  - Password mismatch shows signup-confirm-password-error inline.
 *  - Bad credentials show auth-error.
 */
test.describe('auth', () => {
  test('register a new user redirects to user home, then login works', async ({ page }) => {
    const user = freshUser();

    await page.goto('/register');
    await page.getByTestId('signup-name').fill(user.name);
    await page.getByTestId('signup-email').fill(user.email);
    await page.getByTestId('signup-password').fill(user.password);
    await page.getByTestId('signup-confirm-password').fill(user.password);
    await page.getByTestId('signup-submit').click();

    // New USER -> user home.
    await expect(page).toHaveURL(/\/concerts/);

    // Now log in fresh as the same user.
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/concerts/);
  });

  test('password mismatch shows inline confirm-password error', async ({ page }) => {
    const user = freshUser();

    await page.goto('/register');
    await page.getByTestId('signup-name').fill(user.name);
    await page.getByTestId('signup-email').fill(user.email);
    await page.getByTestId('signup-password').fill(user.password);
    await page.getByTestId('signup-confirm-password').fill('Mismatch123');
    await page.getByTestId('signup-submit').click();

    await expect(page.getByTestId('signup-confirm-password-error')).toBeVisible();
    await expect(page.getByTestId('signup-confirm-password-error')).toContainText(/match/i);
    // Stayed on register; no redirect.
    await expect(page).toHaveURL(/\/register/);
  });

  test('bad credentials show auth-error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(SEED_USER.email);
    await page.getByTestId('login-password').fill('WrongPassword999');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('auth-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
