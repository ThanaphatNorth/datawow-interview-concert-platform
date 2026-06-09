# E2E Tests (Playwright)

End-to-end tests for the Free Concert Tickets app. Drives the real Next.js UI
(`:3000`) and seeds/cleans its own data through the NestJS API (`:4000`).

## Prerequisites

The app stack must already be running (this suite does NOT launch it):

```bash
# from the repo root
docker compose up
```

Seed accounts (password `Password123`): ADMIN `admin@example.com`, USER `user@example.com`.

## Install

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

## Run

```bash
npm test                # all specs (headless chromium)
npm run test:headed     # watch them run
npx playwright test tests/08-no-overbooking.spec.ts   # a single spec
npm run report          # open the HTML report
```

Override targets if needed:

```bash
WEB_BASE_URL=http://localhost:3000 API_BASE_URL=http://localhost:4000 npm test
```

## Design notes

- **Selectors:** `getByTestId` only, against the frontend's `data-testid` contract.
  Per-concert actions are scoped via the card's `data-concert-id` attribute.
  The single allowed exception is toast assertions, which match the
  `.fct-toast-success` / `.fct-toast-error` classes (react-hot-toast exposes no
  per-toast testid).
- **Isolation:** every spec registers fresh users and seeds its own concerts, then
  deletes them in `afterAll`. No shared mutable state; files run fully parallel.
- **Determinism:** no fixed sleeps — UI assertions await state, and seat/stat
  accounting is verified by polling the API (the source of truth), since the
  concert card shows `totalSeats`, not available seats. Admin stats are global
  sums, so the stats spec asserts deltas rather than absolute values.

## Specs

| File | Covers |
| --- | --- |
| `01-auth.spec.ts` | register -> user home, login, password-mismatch error, bad-credentials error |
| `02-role-separation.spec.ts` | USER blocked from /admin (RoleGate) + 403 on admin API |
| `03-user-reservation.spec.ts` | reserve (1/concert) + cancel, seat accounting, /reservations |
| `04-sold-out.spec.ts` | totalSeats=1, second user sees sold-out badge, cannot reserve |
| `05-admin-crud.spec.ts` | admin create -> toast + Overview, delete via confirm dialog |
| `06-admin-stats-history.spec.ts` | stats deltas on reserve/cancel + history Reserve/Cancel rows |
| `07-concert-validation.spec.ts` | empty name / seats<=0 inline field errors |
| `08-no-overbooking.spec.ts` | 5 seats, 20 concurrent reservations -> exactly 5x201, 15x409 |
