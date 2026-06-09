import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api';
import { seedSession } from './helpers/ui';

/**
 * User story: role separation. A USER must not reach admin features.
 * Success criteria:
 *  - A logged-in USER visiting /admin is redirected away (RoleGate -> /concerts).
 *  - A direct API GET /admin/stats with a USER token returns 403.
 */
test.describe('role separation', () => {
  let api: ApiClient;

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test('USER is redirected away from /admin by the RoleGate', async ({ page }) => {
    const { auth } = await api.registerFreshUser();
    await seedSession(page, auth, '/admin');

    // RoleGate sends a wrong-role user to /concerts.
    await expect(page).toHaveURL(/\/concerts/);
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('USER token gets 403 on an admin API endpoint', async ({ page }) => {
    const { auth } = await api.registerFreshUser();

    // Use the page's own request context to prove it is the same kind of client.
    const res = await page.request.get('http://localhost:4000/admin/stats', {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
