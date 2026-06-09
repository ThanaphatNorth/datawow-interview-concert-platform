import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api';
import { seedSession } from './helpers/ui';
import { reserveBtn, cancelBtn } from './helpers/concerts';

/**
 * User story: reserve (1 per concert) + cancel, with seat accounting.
 * Success criteria:
 *  - Fresh user reserves an admin-seeded concert -> button flips to Cancel.
 *  - reservedSeats increments by exactly 1 (verified via API, since the card
 *    shows totalSeats not available seats).
 *  - Cancel -> button flips back to Reserve and the seat returns.
 *  - The reserved concert shows up on /reservations.
 */
test.describe('user reservation', () => {
  let api: ApiClient;
  const concertIds: string[] = [];

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    for (const id of concertIds) await api.deleteConcertAsAdmin(id);
    await api.dispose();
  });

  test('reserve flips to Cancel, decrements seats, then cancel restores', async ({ page }) => {
    const concert = await api.seedConcert({ totalSeats: 10 });
    concertIds.push(concert.id);
    const { auth } = await api.registerFreshUser();

    await seedSession(page, auth, '/concerts');

    // Initially reservable.
    await expect(reserveBtn(page, concert.id)).toBeVisible();

    await reserveBtn(page, concert.id).click();
    // Optimistic/confirmed flip to Cancel.
    await expect(cancelBtn(page, concert.id)).toBeVisible();

    // Seat accounting confirmed at the source of truth.
    await expect
      .poll(async () => (await api.getConcert(auth.accessToken, concert.id)).reservedSeats)
      .toBe(1);

    // Reserving again is impossible: there is no reserve button while held.
    await expect(reserveBtn(page, concert.id)).toHaveCount(0);

    // Cancel restores the Reserve button and the seat.
    await cancelBtn(page, concert.id).click();
    await expect(reserveBtn(page, concert.id)).toBeVisible();
    await expect
      .poll(async () => (await api.getConcert(auth.accessToken, concert.id)).reservedSeats)
      .toBe(0);
  });

  test('reserved concert appears on /reservations', async ({ page }) => {
    const concert = await api.seedConcert({ totalSeats: 5 });
    concertIds.push(concert.id);
    const { auth } = await api.registerFreshUser();

    await seedSession(page, auth, '/concerts');
    await reserveBtn(page, concert.id).click();
    await expect(cancelBtn(page, concert.id)).toBeVisible();

    await page.getByTestId('my-reservations-link').click();
    await expect(page).toHaveURL(/\/reservations/);

    const rows = page.getByTestId('reservation-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId('reservation-concert')).toContainText(concert.name);
    await expect(rows.getByTestId('reservation-status')).toContainText(/active/i);
  });
});
