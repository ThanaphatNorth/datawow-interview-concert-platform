import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api';
import { seedSession } from './helpers/ui';
import { reserveBtn, cancelBtn, soldOutBadge } from './helpers/concerts';

/**
 * User story: sold-out state.
 * Success criteria:
 *  - Admin seeds a concert with totalSeats=1.
 *  - User A reserves it (via API to keep the test focused) -> last seat taken.
 *  - User B opens /concerts and sees concert-soldout-badge, with NO reserve button.
 */
test.describe('sold out', () => {
  let api: ApiClient;
  const concertIds: string[] = [];

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    for (const id of concertIds) await api.deleteConcertAsAdmin(id);
    await api.dispose();
  });

  test('a second user sees the sold-out badge and cannot reserve', async ({ page }) => {
    const concert = await api.seedConcert({ totalSeats: 1 });
    concertIds.push(concert.id);

    // User A takes the only seat.
    const userA = await api.registerFreshUser();
    const reserveRes = await api.reserve(userA.auth.accessToken, concert.id);
    expect(reserveRes.status()).toBe(201);

    // User B sees it as sold out.
    const userB = await api.registerFreshUser();
    await seedSession(page, userB.auth, '/concerts');

    await expect(soldOutBadge(page, concert.id)).toBeVisible();
    await expect(reserveBtn(page, concert.id)).toHaveCount(0);
    // User B holds no reservation, so no cancel button either.
    await expect(cancelBtn(page, concert.id)).toHaveCount(0);
  });
});
