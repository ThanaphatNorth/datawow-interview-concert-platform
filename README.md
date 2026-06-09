# Free Concert Tickets

Reservation platform with role-based access (ADMIN / USER). **Next.js** (web) + **NestJS** (api) + **PostgreSQL**, all runnable via Docker Compose.

> Full technical specs live in [`docs/`](./docs). This README is finalized at the end of the build (setup, architecture, libraries, test commands, and the bonus theory answers).

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:4000

## Structure

```
.
├── api/    # NestJS REST API + Prisma + Postgres
├── web/    # Next.js (App Router) frontend
├── e2e/    # Playwright end-to-end tests
├── docs/   # technical specifications
└── docker-compose.yml
```

_(Setup details, library list, test commands, and bonus answers are added as the build completes.)_
