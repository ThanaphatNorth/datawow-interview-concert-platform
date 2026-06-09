# Free Concert Tickets — Web (Next.js)

Next.js 14 (App Router) + TypeScript + Tailwind + custom CSS Modules. Server state
via TanStack Query, forms via React Hook Form + Zod, toasts via react-hot-toast.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Or via the repo root: `docker compose up --build`.

## Scripts

- `npm run dev` / `build` / `start`
- `npm test` — Jest + React Testing Library unit tests
- `npm run lint` — ESLint (next/core-web-vitals)

## Architecture

`pages → components → hooks (lib/queries.ts) → lib/api-client.ts`. No `fetch` in
components. `lib/auth.ts` stores the JWT in `localStorage` and decodes the role for
UI gating only — the backend Guards are the authoritative security boundary.

## Role-switch toggle (demo shortcut)

The sidebar "Switch to Admin / Switch to user" toggle changes the rendered view
only; it never alters the JWT. A USER navigating to `/admin` is redirected by the
client `RoleGate`, and any admin API call from a USER token still returns `403`.
Use the seeded ADMIN account to access the Admin views.
