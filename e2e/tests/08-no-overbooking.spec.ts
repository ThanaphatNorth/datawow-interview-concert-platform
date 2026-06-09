import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api';

/**
 * Robustness: no over-booking under concurrency.
 * Success criteria:
 *  - Admin seeds a concert with totalSeats=5.
 *  - 20 distinct fresh users fire reserve calls simultaneously (Promise.all).
 *  - EXACTLY 5 return 201, the remaining 15 return 409 (sold out).
 *  - GET /concerts reports reservedSeats === 5 (never more).
 */
test.describe('no over-booking', () => {
  let api: ApiClient;
  let concertId: string | undefined;

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    if (concertId) await api.deleteConcertAsAdmin(concertId);
    await api.dispose();
  });

  test('5 seats: exactly 5 of 20 concurrent reservations succeed', async () => {
    const SEATS = 5;
    const CONTENDERS = 20;

    const concert = await api.seedConcert({ totalSeats: SEATS });
    concertId = concert.id;

    // Register 20 distinct users up front (sequential setup, deterministic).
    const tokens: string[] = [];
    for (let i = 0; i < CONTENDERS; i++) {
      const { auth } = await api.registerFreshUser();
      tokens.push(auth.accessToken);
    }

    // Fire all reservations at once.
    const responses = await Promise.all(tokens.map((t) => api.reserve(t, concert.id)));
    const statuses = responses.map((r) => r.status());

    const created = statuses.filter((s) => s === 201).length;
    const conflicts = statuses.filter((s) => s === 409).length;

    expect(created, `expected exactly ${SEATS} successful reservations`).toBe(SEATS);
    expect(conflicts, 'remaining attempts must be 409 (sold out)').toBe(CONTENDERS - SEATS);
    // No other status codes leaked through.
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

    // Source of truth never exceeds capacity.
    const adminToken = await api.adminToken();
    const after = (await api.listConcerts(adminToken)).find((c) => c.id === concert.id);
    expect(after?.reservedSeats).toBe(SEATS);
  });
});
