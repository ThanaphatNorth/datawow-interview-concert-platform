# Technical Specification — Free Concert Tickets

> Reservation platform with role-based access (ADMIN / USER), built with **Next.js** (frontend) and **NestJS** (backend).

This folder contains the full technical specification for the assignment, split by concern:

| Doc | Scope |
| --- | --- |
| [00-overview.md](./00-overview.md) | System overview, architecture, tech stack, scope |
| [01-frontend-spec.md](./01-frontend-spec.md) | Next.js pages, components, state, validation, responsive design |
| [02-backend-spec.md](./02-backend-spec.md) | NestJS modules, services, guards, data model, migrations, concurrency |
| [03-integration-spec.md](./03-integration-spec.md) | Auth flow, API client, error contract, env, Docker, end-to-end flows |
| [04-api-specification.md](./04-api-specification.md) | REST endpoints, request/response schemas, status codes |

---

## 1. Goal

Build a platform where:

- **USERS** browse concerts, reserve **exactly one seat per concert**, cancel their reservation, and see their own history.
- **ADMINS** create/delete concerts and view the reservation history of **all** users (audit trail).

## 2. Architecture

```
┌──────────────────────┐        HTTPS / JSON        ┌──────────────────────┐
│   Next.js (App Router)│  ───────────────────────►  │   NestJS (REST API)   │
│   - SSR landing page  │   Authorization: Bearer    │   - AuthModule        │
│   - Auth pages        │   <JWT>                    │   - ConcertsModule    │
│   - Concert listing   │  ◄───────────────────────  │   - ReservationsModule│
│   - Admin dashboard   │        JSON + errors       │   - Guards / DTOs     │
└──────────────────────┘                            └──────────┬───────────┘
                                                                │ ORM (Prisma)
                                                                ▼
                                                     ┌──────────────────────┐
                                                     │   PostgreSQL          │
                                                     │   (Docker Compose)    │
                                                     └──────────────────────┘
```

All three services run under a single **`docker-compose.yml`**: `db`, `api`, `web`.

## 3. Tech Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | Next.js 14+ (App Router), React 18, TypeScript | SSR landing page, modern routing |
| Styling | Tailwind CSS + custom CSS modules | Framework allowed; custom CSS required by assignment |
| Data fetching | TanStack Query (React Query) | Cache, retries, optimistic updates for reservations |
| Forms/validation | React Hook Form + Zod | Shared schema with inline error display |
| Backend | NestJS 10, TypeScript | Controllers/Services/DTOs separation |
| ORM | Prisma | Type-safe queries, first-class migrations |
| Database | PostgreSQL 16 | Required |
| Auth | JWT (`@nestjs/jwt`, Passport) + bcrypt | Role in payload, Guards |
| Validation | class-validator + class-transformer | DTO-level server validation |
| Testing | Jest (backend), React Testing Library (frontend bonus) | Required unit tests |
| Containerization | Docker + Docker Compose | Required |

## 4. Roles & Permissions Matrix

| Capability | USER | ADMIN |
| --- | :---: | :---: |
| Register / Login | ✅ | ✅ |
| View all concerts | ✅ | ✅ |
| Reserve a seat (1/concert) | ✅ | ❌ |
| Cancel own reservation | ✅ | ❌ |
| View own reservation history | ✅ | ❌ |
| Create / delete concerts | ❌ | ✅ |
| View all users' reservations (audit) | ❌ | ✅ |

> Admins manage concerts; reservation actions are USER-only. This keeps the audit trail clean (admins are never participants).

## 5. Out of Scope

- Payments (tickets are free).
- Email/notifications.
- Seat-level selection (seats are an integer count, not a seat map).
- Social / OAuth login.

## 6. Non-functional Requirements

- **Concurrency:** no over-booking under simultaneous reservation attempts (see [02-backend-spec.md](./02-backend-spec.md) §8).
- **Validation:** strict server-side validation; clear `400`/`401`/`403`/`409` responses.
- **Responsive:** mobile, tablet, desktop (see [01-frontend-spec.md](./01-frontend-spec.md) §6).
- **Startup:** another dev can run the whole stack with `docker compose up` in < 5 minutes.
