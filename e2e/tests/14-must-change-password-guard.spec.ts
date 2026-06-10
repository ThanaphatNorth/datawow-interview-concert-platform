import { test, expect } from '@playwright/test';
import { ApiClient, SEED_ADMIN, uid } from './helpers/api';

/**
 * User story: the "must change password" rule is enforced at the API, not just
 * the UI. A freshly provisioned admin holds a valid token but may only reach the
 * change-password and profile routes until the temporary password is replaced.
 *
 * Success criteria:
 *  - The flagged admin's token is rejected (403) on normal endpoints...
 *  - ...but GET /auth/me (own profile) and POST /auth/change-password stay open.
 *  - After changing the password, the SAME token works on gated routes — proving
 *    the gate reads authoritative DB state, not a stale JWT claim.
 *
 * Self-contained: provisions its own admin (unique email) so it never races with
 * the seeded new-admin@example.com flow in spec 12.
 */
test.describe('must-change-password backend enforcement', () => {
  test('gates a provisioned admin at the API until the password is changed', async () => {
    const api = await ApiClient.create();
    const adminToken = await api.adminToken();

    // 1. Provision a fresh admin — created with mustChangePassword=true.
    const email = `e2e-provisioned-${uid()}@example.com`;
    const created = await api.rawPost('/admin/users', adminToken, {
      name: 'E2E Provisioned Admin',
      email,
      password: 'TempPass123',
    });
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    try {
      // 2. Logging in works (login is public) and yields a valid token.
      const { accessToken } = await api.login({ email, password: 'TempPass123' });

      // 3. The token is gated on normal endpoints while the flag is set.
      expect((await api.rawGet('/admin/stats', accessToken)).status()).toBe(403);
      expect((await api.rawGet('/concerts', accessToken)).status()).toBe(403);

      // 4. ...but reading one's own profile stays open (@AllowPasswordChange).
      expect((await api.rawGet('/auth/me', accessToken)).status()).toBe(200);

      // 5. Changing the password is allowed and clears the flag.
      const changed = await api.rawPost('/auth/change-password', accessToken, {
        newPassword: 'NewPass123',
      });
      expect(changed.status()).toBe(200);

      // 6. The SAME token now passes the gate — the guard read fresh DB state.
      expect((await api.rawGet('/admin/stats', accessToken)).status()).toBe(200);
    } finally {
      // Cleanup: remove the provisioned admin so it doesn't accumulate.
      await api.rawDelete(`/admin/users/${id}`, adminToken);
      await api.dispose();
    }
  });
});
