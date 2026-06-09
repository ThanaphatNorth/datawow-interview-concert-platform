import { test, expect } from '@playwright/test';
import { ApiClient, SEED_ADMIN } from './helpers/api';
import { seedSession, uiLogin } from './helpers/ui';
import { reserveBtn, cancelBtn } from './helpers/concerts';

/**
 * User story: admin stats counters + history audit.
 * Stats are GLOBAL sums, so we assert DELTAS (before -> after) to stay
 * deterministic under parallel runs. History is scoped to our unique
 * concert name so other tests' events don't interfere.
 *
 * Success criteria:
 *  - After 1 reserve: totalReserved +1; after a cancel: totalReserved back to
 *    baseline and totalCancelled +1.
 *  - /admin/history shows a Reserve row and a Cancel row for our user+concert.
 */
test.describe('admin stats + history', () => {
  let api: ApiClient;
  const concertIds: string[] = [];

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    for (const id of concertIds) await api.deleteConcertAsAdmin(id);
    await api.dispose();
  });

  test('stats reflect a reserve+cancel and history shows both events', async ({ page }) => {
    const concert = await api.seedConcert({ totalSeats: 8 });
    concertIds.push(concert.id);
    const { auth, credentials } = await api.registerFreshUser();

    const adminToken = await api.adminToken();
    const statsRes = await api.rawGet('/admin/stats', adminToken);
    const before = await statsRes.json();

    // --- USER reserves through the UI ---
    await seedSession(page, auth, '/concerts');
    await reserveBtn(page, concert.id).click();
    await expect(cancelBtn(page, concert.id)).toBeVisible();

    // totalReserved increased by exactly 1 (poll: stats query/refresh timing).
    await expect
      .poll(async () => (await (await api.rawGet('/admin/stats', adminToken)).json()).totalReserved)
      .toBe(before.totalReserved + 1);

    // --- USER cancels ---
    await cancelBtn(page, concert.id).click();
    await expect(reserveBtn(page, concert.id)).toBeVisible();

    await expect
      .poll(async () => (await (await api.rawGet('/admin/stats', adminToken)).json()).totalReserved)
      .toBe(before.totalReserved);
    await expect
      .poll(async () => (await (await api.rawGet('/admin/stats', adminToken)).json()).totalCancelled)
      .toBe(before.totalCancelled + 1);

    // --- Admin views history (scoped to our unique concert name) ---
    await uiLogin(page, SEED_ADMIN);
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL(/\/admin\/history/);
    await expect(page.getByTestId('history-table')).toBeVisible();

    const myRows = page
      .getByTestId('history-row')
      .filter({ has: page.getByTestId('history-row-concert').filter({ hasText: concert.name }) });

    // Exactly one RESERVE and one CANCEL row for this concert (match the action cell).
    await expect(
      myRows.filter({ has: page.getByTestId('history-row-action').filter({ hasText: /^Reserve$/ }) }),
    ).toHaveCount(1);
    await expect(
      myRows.filter({ has: page.getByTestId('history-row-action').filter({ hasText: /^Cancel$/ }) }),
    ).toHaveCount(1);
    // Attributed to our user.
    await expect(myRows.first().getByTestId('history-row-user')).toContainText(credentials.name);
  });
});
