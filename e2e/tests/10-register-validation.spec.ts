import { test, expect } from '@playwright/test';
import { freshUser, ApiClient } from './helpers/api';

/**
 * User story: register form client-side validation (inline, via Zod resolver).
 * Success criteria:
 *  - Invalid email -> signup-email-error.
 *  - Password < 8 chars -> signup-password-error.
 *  - Submission is blocked (stays on /register, no account created).
 *  - Registering with an already-used email surfaces an inline email error (409).
 */
test.describe('register form validation', () => {
  test('invalid email and short password show inline errors and block submit', async ({ page }) => {
    await page.goto('/register');

    await page.getByTestId('signup-name').fill('Sara John');
    await page.getByTestId('signup-email').fill('not-an-email');
    await page.getByTestId('signup-password').fill('short'); // < 8 chars
    await page.getByTestId('signup-confirm-password').fill('short');
    await page.getByTestId('signup-submit').click();

    await expect(page.getByTestId('signup-email-error')).toBeVisible();
    await expect(page.getByTestId('signup-password-error')).toBeVisible();
    await expect(page.getByTestId('signup-password-error')).toContainText(/8/);

    // Blocked: no redirect to the user home.
    await expect(page).toHaveURL(/\/register/);
  });

  test('registering with an already-used email shows an inline email error', async ({ page }) => {
    // Pre-create a user via the API so the email is guaranteed to collide.
    const api = await ApiClient.create();
    const existing = freshUser();
    await api.register(existing);
    await api.dispose();

    await page.goto('/register');
    await page.getByTestId('signup-name').fill('Someone Else');
    await page.getByTestId('signup-email').fill(existing.email);
    await page.getByTestId('signup-password').fill('Password123');
    await page.getByTestId('signup-confirm-password').fill('Password123');
    await page.getByTestId('signup-submit').click();

    await expect(page.getByTestId('signup-email-error')).toBeVisible();
    await expect(page.getByTestId('signup-email-error')).toContainText(/registered/i);
    await expect(page).toHaveURL(/\/register/);
  });
});
