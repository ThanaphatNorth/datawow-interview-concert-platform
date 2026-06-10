# 05 — Test Coverage Report

Summary of the test suites and the coverage added in the review pass.

## Commands

```bash
# Backend unit tests (Jest)
cd api && npm test            # add --coverage for the report

# Frontend unit/integration tests (Jest + RTL)
cd web && npm test            # add --coverage for the report

# End-to-end tests (Playwright) — requires the stack running (web :3000, api :4000)
cd e2e && npm test
```

## Results

| Suite | Test files | Tests | Stmt coverage |
| ----- | ---------- | ----- | ------------- |
| API (Jest)        | 15 | 71 | 81.56% |
| Web (Jest + RTL)  | 10 | 63 | 89.51% |
| E2E (Playwright)  | 11 | 20 | n/a    |

Before this pass: API 24 tests / 32.81% stmts, Web 17 tests / 54.41% stmts, E2E 12 tests.

## What was added

### Backend (`api/src`)
- `common/filters/http-exception.filter.spec.ts` — uniform error envelope: string body, validation `string[]`, structured `fieldErrors`, error-label derivation, and the non-`HttpException` → 500 (+ logging) path.
- `auth/strategies/jwt.strategy.spec.ts` — `validate()` maps the JWT payload (`sub`→`id`) and preserves the role.
- `auth/guards/jwt-auth.guard.spec.ts` — `@Public()` bypass vs. delegation to the passport guard.
- `auth/decorators/current-user.decorator.spec.ts` — whole-user vs. single-field extraction; safe when no user is attached.
- Controller specs (`auth`, `concerts`, `reservations`, `admin`) — verify delegation/argument order (e.g. `reserve(userId, concertId)`, `me` scoped to the current user).
- DTO validation specs (`create-concert`, `register`/`login`, `list-events`) — empty/oversized fields, bad email, short password, non-positive/non-integer seats, enum guard, pagination bounds and defaults.
- Extended service specs — `findMine` (scoped + ordered), `findAllEvents` (defaults, filters, skip math), `getProfile` (safe fields, 404).

Remaining uncovered files are NestJS module wiring (`*.module.ts`) and `main.ts` bootstrap — intentionally exercised by E2E rather than unit tests.

### Frontend (`web/src/lib`)
- `api-client.test.ts` — bearer header injection, JSON success, 204, error normalization (string / `string[]` / `fieldErrors` / non-JSON), and `clearSession` on 401; `isApiError` type guard.
- `error-handler.test.ts` — `applyFieldErrors` form mapping; `handleApiError` per-status toasts (400 with/without field errors, 401, 403, 404, 409, fallback).
- `auth.test.tsx` — session storage round-trip, corrupted-JSON tolerance, `clearSession`, `useAuth` outside-provider guard.
- `format.test.ts` — `DD/MM/YYYY HH:mm:ss` padding and invalid-input passthrough.
- `schemas.test.ts` — login/register/concert Zod rules incl. password-match refine and seat coercion.
- `queries.test.tsx` — read-hook endpoints, `useRegister` stripping `confirmPassword`, create/delete cache invalidation.

### E2E (`e2e/tests`)
- `09-reservation-limit.spec.ts` — 1-seat-per-user-per-concert (`201` then `409`), cancel-then-re-reserve, and non-owner `403` / unknown-id `404` on cancel.
- `10-register-validation.spec.ts` — inline email/password errors and the duplicate-email (`409`) inline error.
- `11-auth-redirect.spec.ts` — unauthenticated visits to `/concerts`, `/admin`, `/reservations` redirect to `/login`.

## Notes
- One transient failure during authoring: the standalone `list-events.dto` spec needed an explicit `import 'reflect-metadata'` because `@Type()` reads metadata at decoration time. Fixed by adding the import at the top of that spec.
