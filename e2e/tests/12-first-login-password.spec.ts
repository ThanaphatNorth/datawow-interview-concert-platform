import { test, expect } from '@playwright/test';
import { SEED_NEW_ADMIN, uid } from './helpers/api';
import { uiLogin } from './helpers/ui';

/**
 * User story: a freshly provisioned admin must set a new password on first login.
 * Success criteria:
 *  - Logging in with the temporary password redirects to /change-password (not the portal).
 *  - The portal is unreachable until the password is changed.
 *  - Mismatched passwords show an inline error and don't submit.
 *  - After setting a valid new password, the admin lands on /admin.
 *  - Logging in again with the NEW password goes straight to /admin (flag cleared).
 *
 * NOTE: this spec mutates new-admin@example.com's password. The seed resets it
 * (mustChangePassword=true + temp password) on every run, so a fresh stack is
 * required between repeated executions — consistent with the other seeded specs.
 */
test.describe('admin first-login password change', () => {
  test('forces a password change before entering the portal', async ({ page }) => {
    // Satisfies the policy: uppercase (C), lowercase, and a number (the leading 1).
    const newPassword = `Changed1-${uid()}`;

    // 1. First login with the temporary password -> forced to change-password.
    await uiLogin(page, SEED_NEW_ADMIN);
    await expect(page).toHaveURL(/\/change-password/);

    // 2. The portal is gated until the password is set.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/change-password/);

    // 3. Mismatch is rejected inline (no navigation).
    await page.getByTestId('change-password-new').fill(newPassword);
    await page.getByTestId('change-password-confirm').fill('Mismatch-999');
    await page.getByTestId('change-password-submit').click();
    await expect(page.getByTestId('change-password-confirm-error')).toBeVisible();
    await expect(page).toHaveURL(/\/change-password/);

    // 4. Valid matching password -> lands on the admin portal.
    await page.getByTestId('change-password-confirm').fill(newPassword);
    await page.getByTestId('change-password-submit').click();
    await expect(page).toHaveURL(/\/admin/);

    // 5. Log out, then log back in with the NEW password -> straight to /admin.
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL(/\/login/);

    await uiLogin(page, { email: SEED_NEW_ADMIN.email, password: newPassword });
    await expect(page).toHaveURL(/\/admin/);
  });
});
