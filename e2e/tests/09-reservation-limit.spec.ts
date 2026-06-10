import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api';

/**
 * User story: strict limit of 1 seat per user per concert (+ cancel semantics).
 * These assertions are at the API layer for determinism (status codes), since
 * the rule is enforced server-side and is the authoritative boundary.
 *
 * Success criteria:
 *  - A user's first reserve returns 201.
 *  - A second reserve for the SAME concert returns 409 (duplicate).
 *  - reservedSeats only ever increments by 1 for that user.
 *  - After cancelling, the same user can reserve again (201) and a seat frees up.
 *  - Cancelling someone else's reservation returns 403; an unknown id returns 404.
 */
test.describe('reservation limit: 1 per user per concert', () => {
  let api: ApiClient;
  const concertIds: string[] = [];

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    for (const id of concertIds) await api.deleteConcertAsAdmin(id);
    await api.dispose();
  });

  test('a second reserve for the same concert is rejected with 409', async () => {
    const concert = await api.seedConcert({ totalSeats: 10 });
    concertIds.push(concert.id);
    const { auth } = await api.registerFreshUser();

    const first = await api.reserve(auth.accessToken, concert.id);
    expect(first.status(), 'first reserve should succeed').toBe(201);

    const second = await api.reserve(auth.accessToken, concert.id);
    expect(second.status(), 'duplicate reserve should be 409').toBe(409);

    // Seat accounting never exceeds a single seat for this user.
    expect((await api.getConcert(auth.accessToken, concert.id)).reservedSeats).toBe(1);
  });

  test('cancel frees the seat and lets the same user reserve again', async () => {
    const concert = await api.seedConcert({ totalSeats: 10 });
    concertIds.push(concert.id);
    const { auth } = await api.registerFreshUser();

    const created = await api.reserve(auth.accessToken, concert.id);
    expect(created.status()).toBe(201);
    const { id: reservationId } = await created.json();
    expect((await api.getConcert(auth.accessToken, concert.id)).reservedSeats).toBe(1);

    const cancelled = await api.cancel(auth.accessToken, reservationId);
    expect(cancelled.status()).toBe(200);
    expect((await api.getConcert(auth.accessToken, concert.id)).reservedSeats).toBe(0);

    // Re-reserving after a cancel is allowed.
    const again = await api.reserve(auth.accessToken, concert.id);
    expect(again.status(), 'reserve after cancel should succeed').toBe(201);
    expect((await api.getConcert(auth.accessToken, concert.id)).reservedSeats).toBe(1);
  });

  test('a user cannot cancel another user\'s reservation (403); unknown id is 404', async () => {
    const concert = await api.seedConcert({ totalSeats: 10 });
    concertIds.push(concert.id);

    const owner = await api.registerFreshUser();
    const intruder = await api.registerFreshUser();

    const created = await api.reserve(owner.auth.accessToken, concert.id);
    expect(created.status()).toBe(201);
    const { id: reservationId } = await created.json();

    const forbidden = await api.cancel(intruder.auth.accessToken, reservationId);
    expect(forbidden.status(), 'non-owner cancel should be 403').toBe(403);

    const notFound = await api.cancel(owner.auth.accessToken, 'non-existent-id');
    expect(notFound.status(), 'unknown reservation should be 404').toBe(404);

    // The owner's seat is untouched by the failed cancel attempts.
    expect((await api.getConcert(owner.auth.accessToken, concert.id)).reservedSeats).toBe(1);
  });
});
