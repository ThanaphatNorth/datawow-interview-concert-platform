import { test, expect } from '@playwright/test';
import { ApiClient, SEED_ADMIN, SEED_USER, uid } from './helpers/api';
import { uiLogin } from './helpers/ui';

/**
 * User story: an admin manages other admins from the portal.
 * Success criteria:
 *  - A USER cannot reach Admin Management (UI redirect) and gets 403 on the API.
 *  - An admin creates a new admin -> appears in the list as "Must change password".
 *  - That new admin's first login forces the password change before the portal.
 *  - An admin can remove another admin from the list.
 */
test.describe('admin management', () => {
  let api: ApiClient;

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test('USER is blocked from admin user management (UI + API 403)', async ({ page }) => {
    // API: a USER token is forbidden from creating admins.
    const { auth } = await api.registerFreshUser();
    const res = await api.rawPost('/admin/users', auth.accessToken, {
      name: 'Hacker',
      email: `hacker-${uid()}@example.com`,
      password: 'Password123',
    });
    expect(res.status()).toBe(403);

    // UI: the RoleGate sends a USER away from /admin/users.
    await uiLogin(page, SEED_USER);
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/concerts/);
  });

  test('admin creates an admin who must change password on first login', async ({ page }) => {
    const email = `created-admin-${uid()}@example.com`;
    const tempPassword = 'Temp12345';
    // Satisfies the password policy: uppercase (F), lowercase, and a digit (the 1).
    const newPassword = `Fresh1-${uid()}`;

    // 1. Admin opens Admin Management and creates a new admin.
    await uiLogin(page, SEED_ADMIN);
    await expect(page).toHaveURL(/\/admin/);
    await page.getByTestId('nav-admins').click();
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.getByTestId('admin-name-input').fill('Created Admin');
    await page.getByTestId('admin-email-input').fill(email);
    await page.getByTestId('admin-password-input').fill(tempPassword);
    await page.getByTestId('admin-create-btn').click();

    await expect(
      page.locator('.fct-toast-success').filter({ hasText: 'Admin created' }),
    ).toBeVisible();

    // 2. The new admin shows up in the list flagged to change its password.
    const row = page
      .getByTestId('admin-row')
      .filter({ has: page.getByTestId('admin-row-email').filter({ hasText: email }) });
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('admin-row-status')).toContainText(/must change password/i);

    // 3. Log out, log in as the new admin -> forced to change-password.
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL(/\/login/);

    await uiLogin(page, { email, password: tempPassword });
    await expect(page).toHaveURL(/\/change-password/);

    await page.getByTestId('change-password-new').fill(newPassword);
    await page.getByTestId('change-password-confirm').fill(newPassword);
    await page.getByTestId('change-password-submit').click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test('admin removes another admin from the list', async ({ page }) => {
    // Seed a disposable admin straight through the API, then delete it via the UI.
    const email = `disposable-admin-${uid()}@example.com`;
    const adminToken = await api.adminToken();
    const created = await api.rawPost('/admin/users', adminToken, {
      name: 'Disposable Admin',
      email,
      password: 'Temp12345',
    });
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    await uiLogin(page, SEED_ADMIN);
    await page.getByTestId('nav-admins').click();
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.getByTestId(`admin-delete-${id}`).click();
    await expect(page.getByTestId('admin-delete-dialog')).toBeVisible();
    await expect(page.getByTestId('admin-delete-name')).toContainText('Disposable Admin');
    await page.getByTestId('admin-delete-confirm').click();

    await expect(
      page.locator('.fct-toast-success').filter({ hasText: 'Admin removed' }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('admin-row')
        .filter({ has: page.getByTestId('admin-row-email').filter({ hasText: email }) }),
    ).toHaveCount(0);
  });
});
