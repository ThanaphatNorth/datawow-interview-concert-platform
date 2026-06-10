# Free Concert Tickets

A free-ticket reservation platform with role-based access (**ADMIN** / **USER**), built with **Next.js** (web) + **NestJS** (api) + **PostgreSQL**, fully runnable via Docker Compose.

- **USER** — browse concerts (including sold-out), reserve **one seat per concert**, cancel, and view their own reservation history.
- **ADMIN** — create/delete concerts, view dashboard stats, audit the reservation history of all users, and manage other admins (**Admin Management**: provision/remove admins; new admins set their own password on first login).

> Detailed technical specs live in [`docs/`](./docs). Figma exports are in [`uxui/`](./uxui).

---

## Quick start (Docker) — under 5 minutes

Requires Docker Desktop running.

```bash
cp .env.example .env
docker compose up --build
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000

On boot the API container automatically applies Prisma migrations and seeds three accounts (idempotent):

| Role  | Email                   | Password      | Notes                                                   |
| ----- | ----------------------- | ------------- | ------------------------------------------------------- |
| ADMIN | `admin@example.com`     | `Password123` | Bootstrap admin — ready to use.                         |
| USER  | `user@example.com`      | `Password123` | Regular user.                                           |
| ADMIN | `new-admin@example.com` | `Password123` | **Just provisioned** — forced to set a new password on first login. |

New accounts created via the Sign Up page are always **USER** (admins are seeded). Log in as `admin@example.com` to create concerts, then as the user to reserve.

**First-login password change:** a freshly provisioned admin (`new-admin@example.com`) logs in with the temporary password and is immediately redirected to **Update Password** (new + confirm) before the portal unlocks. Use it to see that flow; the bootstrap admin is exempt so the demo and tests stay frictionless.

To stop and wipe the database volume: `docker compose down -v`.

---

## Architecture

```
Browser ─► Next.js (web :3000) ─► NestJS REST API (api :4000) ─► PostgreSQL (db :5432)
            App Router, SSR        JWT auth + Guards               Prisma ORM + migrations
            TanStack Query         Controller→Service→DTO
            RHF + Zod              concurrency-safe booking
```

- **One repo, two apps** (`api/`, `web/`) + a standalone `e2e/` Playwright project, orchestrated by a single root `docker-compose.yml` (`db`, `api`, `web`).
- **Auth:** JWT carries the user's role; a global `JwtAuthGuard` protects every route (opt-out via `@Public()`), and `RolesGuard` enforces `@Roles(...)` — a USER token on an ADMIN route returns **403**.
- **Separation of concerns:** api = Controllers (HTTP) → Services (logic) → Prisma (data), with class-validator DTOs and a uniform exception filter. web = pages → components → hooks (`lib/queries.ts`) → `lib/api-client.ts` (no `fetch` in components).
- **Data model:** `User`, `Concert` (with a denormalized `reservedSeats` counter), `Reservation` (current state, soft-cancel), and an append-only `ReservationEvent` audit log (RESERVE / CANCEL) that backs the admin History table and Cancel stat.
- **API contract:** see [`docs/04-api-specification.md`](./docs/04-api-specification.md) for the full endpoint reference.

```
.
├── api/    # NestJS + Prisma + PostgreSQL
├── web/    # Next.js (App Router)
├── e2e/    # Playwright end-to-end tests
├── docs/   # technical specifications (00–04)
├── uxui/   # Figma design exports
└── docker-compose.yml
```

---

## Libraries

**Backend (`api/`)** — NestJS 10 (`@nestjs/common|core|platform-express`), Prisma 5 + `@prisma/client`, `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, `bcrypt`, `class-validator` + `class-transformer`, `rxjs`. Tests: Jest + `ts-jest` + `@nestjs/testing`.

**Frontend (`web/`)** — Next.js 14 (App Router) + React 18, TanStack Query 5, React Hook Form 7 + Zod 3 (`@hookform/resolvers`), `react-hot-toast`, Tailwind CSS 3 + custom CSS Modules. Tests: Jest + React Testing Library + `jest-environment-jsdom`.

**E2E (`e2e/`)** — Playwright (`@playwright/test`), selecting via `data-testid`.

---

## Running the tests

```bash
# Backend unit tests (92) — services, guards, auth, admin user mgmt, reservation edge cases
cd api && npm install && npm test

# Frontend unit tests (75) — components, validation, optimistic mutations
cd web && npm install && npm test

# End-to-end (24) — requires the stack running (docker compose up)
cd e2e && npm install && npx playwright install --with-deps chromium && npx playwright test
```

E2E coverage: auth, role separation (USER blocked from admin UI + 403 on admin API), reserve/cancel (1 per concert), sold-out, admin create/delete, stats + history audit, server validation, **admin first-login password change**, **admin management** (provision/remove admins, USER blocked), and **no over-booking** (exactly 5 of 20 concurrent reservations on a 5-seat concert succeed).

---

## Notes

- **Token storage:** the web app stores the JWT in `localStorage` for assignment simplicity (allowed by the spec); the backend Guards remain the authoritative security boundary.
- **Role switch:** the sidebar "Switch to user / Switch to Admin" toggle is a UI convenience only — it never changes the JWT's role. A USER who tries to switch is informed they lack the role; the backend still returns 403 for any privileged call.

---

## UX/UI — adherence & concerns

The auth screens (`web/src/app/(auth)`) follow the Figma exports in [`uxui/`](./uxui) — split panel, field order, icons, copy, and the blue primary CTA all match the artboards. A few points are worth calling out where the design either omits something a production build would need, or where the implementation deliberately diverges from the mockup:

**Registration & roles.** The Figma has a **single shared Sign Up screen** (identical under both the Admin and User sections), and its only fields are Full name / Email / Password / Confirm Password — **no role selector**. Public sign-up therefore always creates a regular `USER`; the backend `register` endpoint never reads a role from the request body (the role comes from the `User.role @default(USER)` schema default).

> ⚠️ **Concern (resolved) — admin registration was ambiguous in the design.** The admin Login artboard offers "Create an account", which implies an admin could self-register — but the shared Sign Up has no role selector, so that link could only ever create a `USER`. Worse, wiring the root-page "Administrator" selection through to the register endpoint as a `role` parameter would be a **privilege-escalation hole**: the `role` value is fully client-controlled, so anyone could `POST /auth/register { role: "ADMIN" }` and self-promote. The role must never be trusted from the client on a public endpoint.
>
> **Decision:** admins are **not** self-registerable.
> - The "Create an account" link is **removed from the admin login** (`/login/admin`); only the user login (`/login`) offers public sign-up, which creates a `USER`.
> - **Admins are created from an Admin Management area inside the admin portal** by an existing admin (a route guarded by `@Roles('ADMIN')`), so the authority to mint an admin comes from a verified admin JWT — never a client param.
> - The **seed admin** (`admin@example.com`) bootstraps the first admin so the chain has a root.
>
> _Status: **implemented.**_ Admin Management lives at `/admin/users` (sidebar → **Admin Management**), backed by `GET/POST/DELETE /admin/users` (controller-level `@Roles('ADMIN')`). Created admins are provisioned with a temporary password and `mustChangePassword=true`. Delete is guarded: you can't remove your own account or the last remaining admin. This is a scope addition beyond the current Figma, styled to match the existing portal.

**First-login password change (provisioned admins).** A provisioned admin starts with a temporary password and the `User.mustChangePassword` flag set. On login the flag flows through in the auth response; the web app redirects to the **Update Password** screen (`/change-password`) and the client-side `RoleGate` keeps every portal page locked until a new password is saved (`POST /auth/change-password`, authenticated — the JWT identifies the user, so no current-password prompt). The seeded `new-admin@example.com` demonstrates this; the bootstrap `admin@example.com` is exempt. _Note:_ enforcement is a UX/onboarding gate on the client — the authoritative security boundary remains the role-based backend Guards. A stricter variant could reject all non-`/auth` calls from a `mustChangePassword` token server-side; that wasn't necessary for this scope.

**Deliberate deviations from the Figma**

- **Left brand panel.** The Figma exports show stray eye/lock glyphs floating in the blue panel; these read as placeholder artifacts rather than intentional art, so they are not reproduced. The lorem-ipsum tagline is replaced with real copy.

**Design gaps to revisit before production** (matches the Figma today, but missing for a real product)

- **No "Forgot password" flow** on the login screen — not in the mockup, but expected for any real deployment.
- **No password-strength guidance** on Sign Up. We enforce a minimum of 8 characters in `lib/schemas.ts`, but the screen shows no requirements/strength meter, so users only learn the rule on submit.
- **No terms/consent checkbox** on Sign Up — commonly required for account creation.
- **Email field uses a person icon** (kept to match the Figma) rather than a mail/envelope icon, which is the more conventional affordance.

**Implemented beyond the static mockup**

- The Figma only shows empty/default states. We added inline per-field validation errors (RHF + Zod), a top-level "Invalid email or password" auth error, password show/hide toggles, and loading states on the submit button.

---

## Bonus — Theory & Strategy

### 1. Performance Optimization (massive dataset, high traffic)

- **Database indexing:** index the hot lookup columns — `User.email` (unique), `Reservation.concertId`, `Reservation.userId`, and `ReservationEvent.createdAt` (already in the schema). Add composite indexes to match real query patterns as they emerge.
- **Avoid N+1 / expensive counts:** concert availability is served from the **denormalized `reservedSeats` counter** instead of `COUNT(*)` over reservations on every request. Keep it correct via the same atomic transaction that creates/cancels reservations.
- **Caching:** put a cache (e.g. Redis) in front of read-heavy, slow-changing data like the concert list (cache-aside with a short TTL, invalidated on create/delete/reserve). Cache `/admin/stats` with a few-seconds TTL since exact real-time precision isn't required.
- **Pagination:** the admin audit endpoint (`/admin/reservations`) is paginated so large histories never return unbounded payloads.
- **Scale-out:** run multiple stateless API instances behind a load balancer (JWT auth is stateless, so this is trivial); add PostgreSQL read replicas and route read traffic (concert listings, audit) to them while writes (reservations) go to the primary.
- **CDN & frontend:** serve Next.js static assets and ISR/SSG pages (e.g. the landing page) via a CDN; use HTTP caching headers. This offloads the origin and cuts latency globally.
- **Connection pooling:** front PostgreSQL with a pooler (PgBouncer / Prisma Accelerate) so a spike in API instances doesn't exhaust DB connections.

### 2. Concurrency Control (1,000 users, last 10 seats, no over-booking)

The reservation path is **safe by construction** using a single atomic conditional update inside a transaction:

```sql
UPDATE "Concert"
SET "reservedSeats" = "reservedSeats" + 1
WHERE id = $1 AND "reservedSeats" < "totalSeats"
RETURNING "reservedSeats";
```

- PostgreSQL evaluates `reservedSeats < totalSeats` under a **row lock**, so concurrent transactions on the same concert serialize on that row. Exactly `totalSeats` increments can ever succeed — **over-booking is impossible**, no matter how many requests arrive in the same millisecond. If the statement updates **0 rows**, the concert is full → `409 Conflict` ("sold out").
- The **1-seat-per-user rule** is enforced at the database level by a **partial unique index** on `(userId, concertId) WHERE status = 'ACTIVE'`. A racing double-click that slips past the application check hits a unique-constraint violation → caught and returned as `409 Conflict` ("already reserved"), and the transaction rolls back (releasing the seat increment).
- This is lighter than a pessimistic `SELECT … FOR UPDATE` (which serializes all readers) and simpler than optimistic version-column retries, while giving the same guarantee. For extreme scale, the next step would be a per-concert queue (e.g. a message broker) that serializes reservation commands — overkill here.

This is verified by an automated E2E test: 20 distinct users fire concurrent reservations at a 5-seat concert; **exactly 5 receive `201` and 15 receive `409`**, and the final `reservedSeats` is always 5.
