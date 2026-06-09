# Integration Specification (Frontend ↔ Backend)

> How the Next.js frontend and NestJS backend connect: auth flow, API client, error contract, environment, Docker wiring, and end-to-end flows.

## 1. Topology

```
Browser ──► Next.js (web :3000) ──► NestJS API (api :4000) ──► PostgreSQL (db :5432)
```

- The browser calls the API directly using `NEXT_PUBLIC_API_URL`.
- In Docker, `web` and `api` resolve each other by service name on the compose network; the browser uses the host-exposed URL.

## 2. Authentication Flow

```
register/login (email,password)
        │
        ▼
POST /auth/register | /auth/login ──► 200 { accessToken, user:{id,email,role} }
        │
        ▼
Frontend stores token + decodes role ──► attaches Authorization: Bearer <token> on every call
        │
        ▼
NestJS JwtAuthGuard validates ──► RolesGuard checks @Roles ──► handler
```

- **Token storage decision:** store the JWT in an **httpOnly cookie** set by a Next.js route handler is the most secure option; for assignment simplicity, an in-memory + `localStorage` fallback via `AuthProvider` is acceptable and documented. Pick one and be consistent. (Recommendation: cookie if time allows, otherwise `localStorage`.)
- The role for UI gating is read from the decoded JWT / `/auth/me`. **UI gating is convenience only — the backend Guards are authoritative.**
- On `401`, the client clears the session and redirects to `/login`.

## 3. API Client

A single typed wrapper (`lib/api-client.ts`):

```ts
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) throw await toApiError(res);   // normalized error
  return res.status === 204 ? (undefined as T) : res.json();
}
```

- TanStack Query wraps these calls (`lib/queries.ts`): `useConcerts`, `useMyReservations`, `useAdminEvents`, `useAdminStats`, `useReserve`, `useCancelReservation`, `useCreateConcert`, `useDeleteConcert`.
- Mutations invalidate `['concerts']` and the relevant reservation keys; `useReserve` performs an optimistic seat decrement with rollback on error.

## 4. Error Contract (shared)

The backend `HttpExceptionFilter` always returns:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Concert is sold out",
  "path": "/concerts/abc/reservations",
  "timestamp": "2026-06-10T00:00:00.000Z"
}
```

`message` is a `string` or `string[]` (validation). The frontend normalizes to:

```ts
type ApiError = { status: number; message: string; fieldErrors?: Record<string,string> };
```

| Status | Meaning | Frontend handling |
| --- | --- | --- |
| 400 | Validation failed | Inline field errors if mappable, else toast |
| 401 | Missing/expired token | Clear session → redirect `/login` + toast |
| 403 | Wrong role / not owner | Toast "No permission" |
| 404 | Not found | Toast / redirect to list |
| 409 | Sold out / already reserved | Toast with the specific message |
| 500 | Server error | Generic toast |

## 5. Environment Variables

**Backend (`api`):**

| Var | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://app:app@db:5432/concerts?schema=public` | Prisma |
| `JWT_SECRET` | `change-me` | required |
| `JWT_EXPIRES_IN` | `1d` | |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:3000` | allow the web origin |

**Frontend (`web`):**

| Var | Example | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | base URL for browser calls |

`.env.example` files provided for both; never commit real secrets.

## 6. CORS

- API enables CORS for `CORS_ORIGIN` with `Authorization` header and credentials (if cookie-based) allowed.

## 7. Docker Compose Wiring

```yaml
services:
  db:
    image: postgres:16
    environment: [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U app"], interval: 5s, retries: 5 }
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: ./api
    depends_on: { db: { condition: service_healthy } }
    command: sh -c "npx prisma migrate deploy && node dist/main.js"
    environment: [DATABASE_URL, JWT_SECRET, CORS_ORIGIN]
    ports: ["4000:4000"]
  web:
    build: ./web
    depends_on: [api]
    environment: [NEXT_PUBLIC_API_URL]
    ports: ["3000:3000"]
volumes: { pgdata: {} }
```

- `api` runs `prisma migrate deploy` before serving → DB schema always current.
- One command to run everything: `docker compose up --build`.

## 8. End-to-End Flows

### 8.1 USER reserves a seat
1. `/concerts` → click Reserve on concert X.
2. `useReserve` optimistically decrements seats, `POST /concerts/X/reservations`.
3. `201` → invalidate `['concerts']`, `['reservations','me']`, `['admin','stats']`, `['admin','events']`, toast success.
4. `409 sold out` / `409 already reserved` → rollback optimistic update, toast the message.

### 8.2 USER cancels
1. `/reservations` → Cancel → confirm modal.
2. `DELETE /reservations/:id` → `200` → refetch lists, seat returns to pool.

### 8.3 ADMIN creates a concert
1. `/admin` → **Create** tab → fill `ConcertForm`.
2. `POST /concerts` → `400` maps to inline errors; `201` clears form + refetch list.

### 8.4 Role enforcement
1. USER manually navigates to `/admin` → client `RoleGate` redirects.
2. If a USER token calls `POST /concerts` directly → backend `RolesGuard` → `403` → toast.
3. The sidebar **role-switch** toggle changes the view only; it never alters the JWT role, so admin API calls from a USER token still `403` (see [01-frontend-spec.md](./01-frontend-spec.md) §11, [02-backend-spec.md](./02-backend-spec.md) §4.3).

## 9. Contract Ownership & Sync

- DTOs (backend) and Zod schemas (frontend) describe the **same** shapes; keep field names/limits identical (concert `name ≤120`, `totalSeats > 0`, `password ≥8`, register `name` required). `confirmPassword` is frontend-only and never sent.
- The API spec ([04-api-specification.md](./04-api-specification.md)) is the single source of truth for request/response shapes.

## 10. Acceptance Criteria

- [ ] Bearer token attached on all authenticated requests.
- [ ] Uniform error shape consumed and surfaced correctly per status code.
- [ ] CORS allows the web origin only.
- [ ] `docker compose up --build` brings up db + api (migrated) + web.
- [ ] All four E2E flows behave as specified.
