# Full-stack Developer Assignment (Next.js + NestJS)

> Free Concert Tickets — reservation platform with role-based access (ADMIN / USER).

## Time & Submission

- **Time limit:** 7 days to complete (suggested effort: **3–4 hours**).
- **Submission:** Source code + Docker run instructions.
- **Git:** Share a GitHub repo link. Commit regularly (avoid one giant "Final Commit").
- **README must include:** setup instructions, architecture overview, library list, test execution commands.
- If stuck on one task, do as much as possible elsewhere — handling ambiguity is part of the evaluation.

---

## User Stories / Tasks

### Task 1 — Basic Setup & Landing Page
- [ ] New project: **Next.js** (frontend) + **NestJS** (backend).
- [ ] Landing page in Next.js as the main entry point.

### Task 2 — Responsive Design
- [ ] Responsive across **mobile, tablet, desktop**, based on the provided Figma design.
- [ ] Use CSS/HTML. CSS frameworks allowed (Tailwind, Bootstrap), but **custom CSS/HTML should also be evident**.

### Task 3 — Authentication & Authorization (JWT)
- [ ] JWT-based authentication.
- [ ] Two roles: **ADMIN** and **USER**.
- [ ] Protect backend routes with **NestJS Guards**.
- [ ] JWT payload must contain the user's role.
- [ ] Prevent USER accounts from accessing ADMIN endpoints.

### Task 4 — Free Concert Tickets (CRUD & Logic)

**Infrastructure**
- [ ] **PostgreSQL** database managed via **Docker Compose**.
- [ ] Database versioning via **Migrations**.
- [ ] **Dockerfile** for containerized build/run.
- [ ] Any ORM of choice.

**Admin Features (ADMIN role only)**
- [ ] Concert Management: **Create** and **Delete** concerts (Name, Description, Total Seats).
- [ ] Audit Trail: view full reservation history of **all users**.

**User Features (USER role only)**
- [ ] Discovery: view all concerts (including fully booked / out of tickets).
- [ ] Reservation Logic: reserve a seat — **strict limit: 1 seat per user per concert**.
- [ ] Cancel an existing reservation.
- [ ] Personal History: private list of own reservations.

### Task 5 — Server-Side Validation & Error Handling
- [ ] Strict server-side validation with **Zod** or **class-validator**.
- [ ] Invalid requests (missing title, invalid seat count, unauthorized role) return a clear **400 Bad Request** or appropriate HTTP error.
- [ ] Frontend catches these errors and shows clear UI feedback (toasts or inline form errors).

### Task 6 — Unit Testing
- [ ] **Backend:** comprehensive unit tests for CRUD handlers + reservation logic, covering edge cases (e.g., booking when a concert is full).
- [ ] **Frontend (optional bonus):** basic component / integration testing.

---

## Design

- **Figma:** https://www.figma.com/design/fYPlbS6c5i7tlx6buHWY5w/Full-Stack-Developer?node-id=0-1&t=E8VNeo0nAayAfbiL-1

---

## Review Criteria

- **Correctness & Completeness** — fulfills all User and Admin stories.
- **Architecture & Clarity** — maintainable, clean separation of concerns (Services, Controllers, DTOs).
- **Responsive Design** — Figma translates well to all device sizes.
- **Robustness** — handles bad data and high-stress booking attempts.
- **Documentation** — README lets another dev run/test in under 5 minutes.

---

## Bonus Tasks (Theory & Strategy)

Provide brief written answers in the README:

1. **Performance Optimization** — how to optimize the site for a massive dataset and high traffic (e.g., caching, indexing, CDN).
2. **Concurrency Control** — handle the race condition where 1,000 users try to reserve the last 10 seats at the exact same millisecond. Explain the strategy to guarantee **no over-booking** (e.g., DB transactions, pessimistic/optimistic locking, message queues).
