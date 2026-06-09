# Frontend Technical Specification (Next.js)

> Maps to **Task 1** (setup + landing), **Task 2** (responsive design), and the frontend half of **Task 3** (auth) and **Task 5** (error feedback).

## 1. Stack & Conventions

- **Next.js 14+** with the **App Router** (`app/` directory), **TypeScript**, React 18.
- **Tailwind CSS** for layout utilities **plus** hand-written CSS Modules for bespoke components (assignment requires evidence of custom CSS/HTML).
- **TanStack Query** for server state (caching, refetch, optimistic updates).
- **React Hook Form + Zod** for forms and client-side validation.
- **react-hot-toast** (or equivalent) for toast notifications.
- Path alias `@/*` → `src/*`.

## 2. Directory Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, providers, toaster
│   │   ├── page.tsx                # Landing page (SSR)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── concerts/page.tsx       # USER: browse + reserve/cancel concerts
│   │   ├── reservations/page.tsx   # USER: my reservation history
│   │   └── admin/
│   │       ├── page.tsx            # ADMIN: dashboard (stats + Overview/Create tabs)
│   │       └── history/page.tsx    # ADMIN: audit trail table
│   ├── components/
│   │   ├── ui/                     # Button, Input, Card, Modal, Badge, Spinner
│   │   ├── concerts/               # ConcertCard, ConcertForm, SeatBadge
│   │   ├── admin/                  # StatCard, ConcertTabs, ConfirmDeleteDialog, HistoryTable
│   │   ├── layout/                 # Sidebar, RoleSwitch, Container, RoleGate
│   │   └── feedback/               # Toast helpers, ErrorBoundary, EmptyState
│   ├── lib/
│   │   ├── api-client.ts           # fetch wrapper (see 03-integration-spec)
│   │   ├── auth.ts                 # token storage, decode role, useAuth hook
│   │   ├── queries.ts              # React Query hooks
│   │   └── schemas.ts              # Zod schemas (shared with forms)
│   ├── providers/
│   │   └── app-providers.tsx       # QueryClientProvider, AuthProvider
│   └── styles/
│       ├── globals.css             # Tailwind directives + CSS variables (tokens)
│       └── *.module.css            # custom component CSS
├── public/
├── next.config.js
├── tailwind.config.ts
└── Dockerfile
```

## 3. Routes & Access

| Route | Render | Access | Description |
| --- | --- | --- | --- |
| `/` | SSR | Public | Landing page, CTA to login/register *(not in Figma — see §4.1)* |
| `/login` | Client | Public | Email + password; "Login" button |
| `/register` | Client | Public | Full name + email + password + confirm (USER role) |
| `/concerts` | Client | Authenticated | List all concerts incl. fully-booked |
| `/reservations` | Client | USER | Own reservation history + cancel *(not in Figma — see §4.3)* |
| `/admin` | Client | ADMIN | Dashboard: 3 stat cards + Overview/Create tabs |
| `/admin/history` | Client | ADMIN | Audit trail table (all users' Reserve/Cancel events) |

> **Sidebar layout (from Figma):** authenticated pages share a fixed left sidebar — role title ("Admin"/"User") at top, nav items with line icons, a **"Switch to user"/"Switch to Admin"** toggle, and **Logout** pinned at the bottom. See §11 for how to handle the role toggle safely.

**Route protection:** a client-side `RoleGate` + `useAuth` redirect guards protected pages; the backend Guards are the real security boundary (see [02-backend-spec.md](./02-backend-spec.md)). Unauthenticated access to a protected route → redirect to `/login`. Wrong role → redirect to `/concerts` with an error toast.

## 4. Key Pages & Components

### 4.1 Landing page (`/`)
- **Not present in Figma** — designs open directly on Login. Still required by Task 1 ("landing page as the main entry point").
- Reuse the login screen's split-panel aesthetic: blue brand panel (logo + tagline "Powering the tools that power the team.") + value proposition and "Get free tickets" CTA → `/login` / `/register`.
- Server-rendered, public, nothing role-specific.

### 4.2 Auth screens (`/login`, `/register`)
- **Split layout:** left = solid blue brand panel (BRAND logo top, large pull-quote tagline + paragraph bottom); right = the form, centered.
- **Login:** Email (person icon) + Password (lock icon, show/hide eye toggle) → primary "Login" button → "Don't have an account? Create an account" link. *(Figma copy says "Login as Administrator"; use neutral "Login" and derive role from the JWT.)*
- **Sign Up:** Full name, Email, Password (Create a Password), Confirm Password (Re-enter) → "Create an account" → "Already have an account? Login" link. Inline Zod errors incl. password-match.

### 4.3 User home (`/concerts`, USER)
- Sidebar title "User"; nav: Home, Switch to Admin, Logout.
- Stacked `ConcertCard`s (responsive: 1 / 2 / 3 columns): blue title, full description, seat count with person icon.
- Per-card action toggles by the user's state: **"Reserve"** (blue) when not reserved & seats remain; **"Cancel"** (red) when the user holds a seat; **"Sold out"** (disabled) when full. *(Sold-out state is not in Figma — design it to match; Task 4 requires showing fully-booked concerts.)*
- Reservation/cancel use **optimistic update** → confirmed/rolled-back on error, with success toast.
- **Personal history** (Task 4) is not a separate Figma screen — the inline Reserve/Cancel state partially covers it, but add a dedicated `/reservations` list (concert name, date, status) to fully satisfy the requirement.

### 4.4 Admin dashboard (`/admin`, ADMIN)
- Sidebar title "Admin"; nav: Home, History, Switch to user, Logout.
- **Three stat cards** at top from `GET /admin/stats`: Total of seats (blue), Reserve (teal), Cancel (coral) — each with icon, label, large number.
- **Tabs: Overview | Create.**
  - **Overview:** stacked concert cards (blue title, description, seat count) each with a red **Delete** button → confirmation dialog (§4.5) → success toast.
  - **Create:** `ConcertForm` — Concert Name, Total of seat, Description (textarea), primary **Save** button (bottom-right) → "Create successfully" toast + return to Overview. Inline Zod validation.

### 4.5 Delete confirmation dialog (ADMIN)
- Centered modal over dimmed backdrop: red ✕ icon, "Are you sure to delete?" + the concert name in quotes, **Cancel** (outline) and **Yes, Delete** (red) buttons.

### 4.6 Admin history (`/admin/history`, ADMIN)
- Full-width table: **Date time · Username · Concert name · Action** (Reserve / Cancel), newest first.
- Backed by `GET /admin/reservations` (event log). Filter by concert / action; paginated.

## 5. State Management

- **Server state:** TanStack Query. Query keys: `['concerts']`, `['reservations','me']`, `['admin','events']`, `['admin','stats']`.
- **Auth state:** lightweight `AuthProvider` (React context) holding `{ user, role, token, login(), logout() }`; token persisted (see integration spec for storage decision).
- **Form state:** React Hook Form per form, no global form store.
- **Mutations invalidate** the relevant query keys; reservation mutations also do optimistic updates on `['concerts']`.

## 6. Responsive Design (Task 2)

Source of truth: the provided [Figma](https://www.figma.com/design/fYPlbS6c5i7tlx6buHWY5w/Full-Stack-Developer). Translate tokens (colors, spacing, typography) into `globals.css` CSS variables and `tailwind.config.ts`.

**Breakpoints:**

| Name | Min width | Concert grid | Nav |
| --- | --- | --- | --- |
| Mobile | 0 | 1 column | hamburger drawer |
| Tablet | 768px (`md`) | 2 columns | condensed bar |
| Desktop | 1024px (`lg`) | 3 columns | full bar |

- Mobile-first CSS; layout via CSS Grid/Flexbox.
- At least one component (e.g. `ConcertCard` or `Navbar`) implemented with **custom CSS Modules** rather than Tailwind, to satisfy the "custom CSS evident" requirement.
- Fluid typography via `clamp()`; tap targets ≥ 44px on mobile.
- Test at 375px, 768px, 1280px.

> **Design source:** desktop exports are in [`/uxui`](../uxui). **Only desktop is provided** — tablet/mobile reflow (sidebar → drawer, card grid 3→1) is the implementer's responsibility per the breakpoints above. Pull exact colors/fonts/spacing from the exports.

**Tokens (extracted from the exports):**

| Token | Value (approx.) | Use |
| --- | --- | --- |
| `--primary` | bright blue `#2F80ED` | buttons, links, active nav, concert titles |
| `--brand` | deep blue `#1668A8` | login left panel |
| `--success` | teal `#12A887` | Reserve stat card, success |
| `--danger` | coral `#F2675F` | Cancel/Delete buttons, danger stat |
| `--success-toast-bg` | light green | success toasts |
| radius | ~8px inputs / ~12px cards | — |

- **Inputs:** leading icon (person/lock), password show/hide eye toggle.
- **Toasts:** top-right, icon + message + dismiss ✕ ("Create successfully" / "Delete successfully").

## 7. Validation & Error Handling (Task 5, frontend half)

- **Client validation:** Zod schemas in `lib/schemas.ts` mirror backend DTOs (register, login, create-concert). React Hook Form shows **inline field errors** before submit.
- **Server errors:** the API client normalizes error responses (see [03-integration-spec.md](./03-integration-spec.md) §4) into `{ status, message, fieldErrors? }`.
  - `400` with `fieldErrors` → map onto form fields (inline).
  - `400`/`409` without field map → **toast** (e.g. "You already reserved a seat for this concert", "Concert is sold out").
  - `401` → clear session, redirect to `/login`, toast "Session expired".
  - `403` → toast "You don't have permission".
- Loading states: skeletons for lists, spinner on buttons during mutations.
- Empty states for no concerts / no reservations.

## 8. Shared Zod Schemas (excerpt)

```ts
// lib/schemas.ts
export const registerSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],   // client-side only; not sent to the API
});

export const createConcertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().min(1, 'Description is required').max(2000),
  totalSeats: z.coerce.number().int().positive('Seats must be > 0'),
});
```

## 9. Testing (Task 6, optional bonus)

- **React Testing Library + Jest**.
- Priority components: `ConcertCard` (reserve/sold-out/reserved states), `ConcertForm` (validation), reservation mutation hook (optimistic update + rollback).
- Mock the API client; assert toast and inline-error behavior.

## 11. Role Switch Toggle (design note)

The Figma sidebar shows **"Switch to user" / "Switch to Admin"**. This is UI-only and must not bypass backend security (the API always returns `403` for a USER token on ADMIN routes — see [02-backend-spec.md](./02-backend-spec.md) §4.3).

- The toggle changes the rendered view only; it never changes the JWT role.
- **Recommended:** show it only for accounts that hold the target role, or implement it as "log out → log in as the other seeded account". The seed provides one ADMIN + one USER for easy testing.
- Document it in the README as a demo shortcut.

## 12. Acceptance Criteria

- [ ] SSR landing page is the entry point (built even though absent from Figma).
- [ ] Responsive at mobile/tablet/desktop with custom CSS present.
- [ ] Split-panel auth screens; Sign Up has full name + confirm password (client-side match).
- [ ] USER home lists concerts with Reserve/Cancel/Sold-out states + own history.
- [ ] ADMIN dashboard shows 3 stat cards + Overview/Create tabs; delete uses confirm dialog.
- [ ] ADMIN history table renders the Reserve/Cancel event log.
- [ ] Role-switch toggle never elevates privileges (backend stays authoritative).
- [ ] Server validation errors surface as inline errors or toasts.
