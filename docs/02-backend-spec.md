# Backend Technical Specification (NestJS)

> Maps to **Task 3** (auth/authorization), **Task 4** (CRUD + reservation logic + infra), **Task 5** (server validation), **Task 6** (unit tests), and the bonus **Concurrency Control** question.

## 1. Stack & Conventions

- **NestJS 10**, TypeScript, modular architecture.
- **Prisma** ORM + **PostgreSQL 16**; migrations via `prisma migrate`.
- **JWT** auth (`@nestjs/jwt` + Passport `passport-jwt`), passwords hashed with **bcrypt**.
- **class-validator / class-transformer** for DTO validation via a global `ValidationPipe`.
- Clean separation: **Controller** (HTTP) → **Service** (business logic) → **Prisma** (data). DTOs define the contract.

## 2. Module Structure

```
api/
├── src/
│   ├── main.ts                      # bootstrap, global ValidationPipe, CORS, exception filter
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── auth.service.ts          # hashing, validate, sign JWT
│   │   ├── strategies/jwt.strategy.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── guards/roles.guard.ts
│   │   ├── decorators/roles.decorator.ts
│   │   ├── decorators/current-user.decorator.ts
│   │   └── dto/{register,login}.dto.ts
│   ├── concerts/
│   │   ├── concerts.module.ts
│   │   ├── concerts.controller.ts
│   │   ├── concerts.service.ts
│   │   └── dto/create-concert.dto.ts
│   ├── reservations/
│   │   ├── reservations.module.ts
│   │   ├── reservations.controller.ts
│   │   ├── reservations.service.ts
│   │   └── dto/create-reservation.dto.ts
│   └── common/
│       ├── filters/http-exception.filter.ts   # uniform error shape
│       └── enums/role.enum.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/                            # e2e (optional)
├── Dockerfile
└── package.json
```

## 3. Data Model (Prisma)

```prisma
enum Role {
  USER
  ADMIN
}

enum ReservationStatus {
  ACTIVE
  CANCELLED
}

model User {
  id           String             @id @default(uuid())
  email        String             @unique
  name         String             // "Full name" from Sign Up screen
  passwordHash String
  role         Role               @default(USER)
  reservations Reservation[]
  events       ReservationEvent[]
  createdAt    DateTime           @default(now())
}

model Concert {
  id            String             @id @default(uuid())
  name          String
  description   String
  totalSeats    Int
  reservedSeats Int                @default(0)   // denormalized counter for fast availability + atomic guard
  reservations  Reservation[]
  events        ReservationEvent[]
  createdAt     DateTime           @default(now())
}

model Reservation {
  id        String            @id @default(uuid())
  userId    String
  concertId String
  status    ReservationStatus @default(ACTIVE)
  createdAt DateTime          @default(now())
  cancelledAt DateTime?

  user      User    @relation(fields: [userId], references: [id])
  concert   Concert @relation(fields: [concertId], references: [id])

  // Enforces "1 active seat per user per concert" at the DB level.
  // Partial unique index on (userId, concertId) WHERE status = 'ACTIVE'.
  @@index([concertId])
  @@index([userId])
}

enum ReservationAction {
  RESERVE
  CANCEL
}

// Append-only audit log. Backs the Admin "History" table (Date time, Username,
// Concert name, Action) and the "Cancel" dashboard counter. A reserve→cancel→
// reserve sequence produces THREE rows here, while `Reservation` holds only the
// single current-state row.
model ReservationEvent {
  id        String            @id @default(uuid())
  userId    String
  concertId String
  action    ReservationAction
  createdAt DateTime          @default(now())

  user      User    @relation(fields: [userId], references: [id])
  concert   Concert @relation(fields: [concertId], references: [id])

  @@index([concertId])
  @@index([createdAt])
}
```

**Key invariants enforced in the DB:**
- `reservedSeats <= totalSeats` (guarded by the atomic conditional update — see §8).
- One **ACTIVE** reservation per `(userId, concertId)` — partial unique index (added via raw SQL in a migration, since Prisma lacks native partial-index support).

> The audit trail keeps CANCELLED rows (soft cancel) so admins see full history. Cancelling sets `status=CANCELLED`, `cancelledAt=now()`, and decrements `reservedSeats`.

## 4. Authentication & Authorization (Task 3)

### 4.1 JWT
- On login, sign a token with payload `{ sub: userId, email, role }`.
- `JWT_SECRET` and `JWT_EXPIRES_IN` from env (default `1d`).
- `JwtStrategy` validates the token and attaches `req.user = { id, email, role }`.

### 4.2 Guards
- `JwtAuthGuard` — verifies a valid bearer token (applied to all protected routes).
- `RolesGuard` — reads `@Roles(Role.ADMIN)` metadata and compares against `req.user.role`. Throws `403 Forbidden` on mismatch.
- Public routes (`/auth/register`, `/auth/login`) marked with a `@Public()` decorator.

```ts
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Post('concerts')
create(@Body() dto: CreateConcertDto) { ... }
```

**Requirement:** USER tokens hitting an ADMIN route receive `403` — never `200`. This is covered by unit tests on `RolesGuard`.

### 4.3 Role switching (design note)
The Figma sidebar has a **"Switch to user" / "Switch to Admin"** toggle. This is a UI convenience and **must not** weaken backend security:
- The backend stays strictly role-gated — a USER token always gets `403` on ADMIN routes, regardless of any client toggle.
- The toggle only changes the **rendered view**; it never elevates the JWT's role.
- **Recommended implementation:** treat "switch" as a re-auth (log out → log in as the other seeded account), OR only render the toggle for accounts that genuinely hold the target role. The seed creates one ADMIN and one USER so reviewers can test both. Document the toggle as a demo shortcut in the README.

## 5. Endpoints (summary)

Full contract in [04-api-specification.md](./04-api-specification.md).

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create USER account |
| POST | `/auth/login` | Public | Return JWT |
| GET | `/auth/me` | Auth | Current user |
| GET | `/concerts` | Auth | List all concerts (incl. sold out) |
| POST | `/concerts` | ADMIN | Create concert |
| DELETE | `/concerts/:id` | ADMIN | Delete concert |
| POST | `/concerts/:id/reservations` | USER | Reserve a seat (1/concert) |
| DELETE | `/reservations/:id` | USER | Cancel own reservation |
| GET | `/reservations/me` | USER | Own reservation history |
| GET | `/admin/reservations` | ADMIN | Audit trail (event log: Reserve & Cancel) |
| GET | `/admin/stats` | ADMIN | Dashboard counters (seats / reserved / cancelled) |

## 6. Service Logic Highlights

### 6.1 ConcertsService
- `create(dto)` — insert with `reservedSeats=0`.
- `findAll()` — return all concerts with computed `availableSeats = totalSeats - reservedSeats`.
- `remove(id)` — delete concert; reservations cascade or are blocked per business rule (decide: block delete if ACTIVE reservations exist → `409`, or cascade-cancel. Default: **cascade delete** within a transaction, documented in API spec).

### 6.2 ReservationsService
- `reserve(userId, concertId)` — see §8 (concurrency-safe). On success, **also append a `ReservationEvent(action=RESERVE)`** within the same transaction.
- `cancel(userId, reservationId)` — verify ownership (`403` if not owner), set `CANCELLED`, decrement `reservedSeats`, and **append a `ReservationEvent(action=CANCEL)`** — all in one transaction; idempotent if already cancelled (no duplicate event).
- `findMine(userId)` — the user's reservations (current state) for personal history.
- `findAllEvents(filters)` — the admin audit table, reading from `ReservationEvent` joined to user (`name`) and concert (`name`), newest first, paginated.

### 6.3 StatsService (admin dashboard)
- `getStats()` → `{ totalSeats, totalReserved, totalCancelled }`:
  - `totalSeats` = `SUM(Concert.totalSeats)`.
  - `totalReserved` = `SUM(Concert.reservedSeats)` (active seats) — or `COUNT(ReservationEvent WHERE action=RESERVE)` if "total ever reserved" is intended; **pick one and document it** (the Figma label is just "Reserve").
  - `totalCancelled` = `COUNT(ReservationEvent WHERE action=CANCEL)`.

## 7. Validation & Error Handling (Task 5)

- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- DTOs:
  - `CreateConcertDto`: `name` (`@IsString @IsNotEmpty @MaxLength(120)`), `description` (`@IsString @IsNotEmpty`), `totalSeats` (`@IsInt @IsPositive`).
  - `RegisterDto`: `name` (`@IsString @IsNotEmpty`), `email` (`@IsEmail`), `password` (`@MinLength(8)`). (Sign Up's "Confirm Password" is validated client-side only.)
  - `LoginDto`: `email` (`@IsEmail`), `password` (`@MinLength(8)`).
- A global `HttpExceptionFilter` returns a uniform error shape (see integration spec §4):

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["totalSeats must be a positive number"], "path": "/concerts", "timestamp": "..." }
```

- Error map: `400` validation, `401` missing/invalid token, `403` wrong role / not owner, `404` concert/reservation not found, `409` business conflict (sold out, duplicate reservation).

## 8. Concurrency Control — No Over-booking (Bonus)

The core robustness requirement: 1,000 users racing for the last 10 seats must never over-book.

**Chosen strategy: atomic conditional UPDATE inside a transaction.**

```sql
-- Single atomic statement; only succeeds while seats remain.
UPDATE "Concert"
SET "reservedSeats" = "reservedSeats" + 1
WHERE id = $concertId AND "reservedSeats" < "totalSeats"
RETURNING "reservedSeats";
```

Reservation flow (wrapped in a Prisma `$transaction`, isolation `READ COMMITTED` is sufficient because the conditional update is atomic):

1. Atomic increment above. If `0 rows` returned → **sold out** → `409 Conflict`.
2. Insert `Reservation(status=ACTIVE)`. The **partial unique index** on `(userId, concertId) WHERE status='ACTIVE'` rejects a second seat for the same user → catch unique violation → `409 Conflict` ("already reserved") and the transaction rolls back (releasing the increment).

Why this works:
- The `WHERE reservedSeats < totalSeats` predicate is evaluated atomically by Postgres under a row lock, so concurrent transactions serialize on that row — exactly `totalSeats` increments can ever succeed. **No over-booking by construction.**
- The unique index enforces the 1-per-user rule even under concurrent double-clicks.

**Alternatives considered (documented for the bonus answer):**
- *Pessimistic lock* (`SELECT ... FOR UPDATE` on the concert row) — correct but serializes all reservers; the atomic update is the lighter equivalent.
- *Optimistic lock* (version column, retry on conflict) — viable; adds retry complexity.
- *Message queue* (serialize reservations per concert) — best for extreme scale, overkill here.

## 9. Performance Notes (Bonus)

- Indexes on `Reservation.concertId`, `Reservation.userId`, `User.email` (unique).
- `availableSeats` served from the denormalized `reservedSeats` counter (no `COUNT(*)` per request).
- Caching layer (Redis) and read replicas noted as scale-out path; CDN for the static Next.js assets.
- Pagination on `/reservations` (audit) to bound payloads on large datasets.

## 10. Infrastructure (Task 4)

- **`docker-compose.yml`**: `db` (postgres:16 + volume + healthcheck), `api` (NestJS, waits for db healthy, runs `prisma migrate deploy` on boot), `web` (Next.js).
- **`Dockerfile`** (api): multi-stage build → `prisma generate` → `nest build` → slim runtime.
- Migrations committed under `prisma/migrations/`; `prisma migrate deploy` applies them in containers.
- Seed script creates one ADMIN and one USER for quick testing.

## 11. Testing (Task 6)

- **Jest unit tests** with mocked PrismaService:
  - `ConcertsService`: create, findAll (availability math), delete.
  - `ReservationsService`: reserve success; **reserve when full → 409**; **duplicate reservation → 409**; cancel by owner; cancel by non-owner → 403; cancel already-cancelled (idempotent).
  - `RolesGuard`: USER → ADMIN route denied; ADMIN allowed.
  - `AuthService`: password hash/verify, JWT payload contains role.
- Target the edge cases explicitly called out in the assignment (booking a full concert).

## 12. Acceptance Criteria

- [ ] JWT auth with role in payload; Guards enforce role separation (USER→ADMIN = 403).
- [ ] Concert create/delete (ADMIN), reserve/cancel/history (USER), audit (ADMIN).
- [ ] 1 seat per user per concert enforced at DB level.
- [ ] No over-booking under concurrent load.
- [ ] Strict DTO validation → 400; uniform error shape.
- [ ] Postgres via Docker Compose, migrations, Dockerfile present.
- [ ] Unit tests cover CRUD + reservation edge cases.
