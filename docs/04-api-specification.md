# API Specification (REST)

> Single source of truth for the NestJS REST contract. Base URL: `http://localhost:4000`. All bodies are JSON. Authenticated requests send `Authorization: Bearer <JWT>`.

## Conventions

- **Auth:** `Auth` = any valid token; `USER`/`ADMIN` = role required (enforced by `RolesGuard`).
- **IDs:** UUID strings.
- **Timestamps:** ISO-8601 UTC.
- **Errors:** uniform shape (see [Error Responses](#error-responses)).

---

## Auth

### POST `/auth/register`
Create a USER account. *(Public)* — backs the **Sign Up** screen.

**Request**
```json
{ "name": "Sara John", "email": "user@example.com", "password": "secret123" }
```
> `confirmPassword` from the Sign Up form is validated **client-side only** and is not sent.

**201 Created**
```json
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "name": "Sara John", "email": "user@example.com", "role": "USER" }
}
```
**Errors:** `400` missing name / invalid email / password < 8 chars · `409` email already registered.

> Admin accounts are created via seed/migration, not this endpoint.

---

### POST `/auth/login`
Authenticate and receive a JWT. *(Public)*

**Request**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**200 OK**
```json
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "name": "Sara John", "email": "user@example.com", "role": "USER" }
}
```
**JWT payload:** `{ "sub": "uuid", "email": "...", "role": "USER", "iat": ..., "exp": ... }`

**Errors:** `400` malformed body · `401` invalid credentials.

---

### GET `/auth/me`
Return the current authenticated user. *(Auth)*

**200 OK**
```json
{ "id": "uuid", "name": "Sara John", "email": "user@example.com", "role": "USER" }
```
**Errors:** `401` missing/invalid token.

---

## Concerts

### GET `/concerts`
List **all** concerts, including sold-out ones. *(Auth — USER & ADMIN)*

**200 OK**
```json
[
  {
    "id": "uuid",
    "name": "Summer Live",
    "description": "Open-air festival",
    "totalSeats": 500,
    "reservedSeats": 500,
    "availableSeats": 0,
    "soldOut": true,
    "createdAt": "2026-06-10T00:00:00.000Z",
    "myReservation": { "id": "uuid", "status": "ACTIVE" }
  }
]
```
- `availableSeats = totalSeats - reservedSeats`; `soldOut = availableSeats === 0`.
- `myReservation` is present only for USER tokens that have an active reservation (lets the UI render "Reserved ✓"); `null` otherwise. Omitted/null for ADMIN.

---

### POST `/concerts`
Create a concert. *(ADMIN)*

**Request**
```json
{ "name": "Summer Live", "description": "Open-air festival", "totalSeats": 500 }
```
**Validation:** `name` non-empty ≤120 · `description` non-empty · `totalSeats` integer > 0.

**201 Created**
```json
{ "id": "uuid", "name": "Summer Live", "description": "Open-air festival",
  "totalSeats": 500, "reservedSeats": 0, "availableSeats": 500, "createdAt": "..." }
```
**Errors:** `400` validation · `401` no token · `403` not ADMIN.

---

### DELETE `/concerts/:id`
Delete a concert (cascade-cancels its reservations within a transaction). *(ADMIN)*

**200 OK**
```json
{ "id": "uuid", "deleted": true }
```
**Errors:** `401` · `403` not ADMIN · `404` concert not found.

> Cascade behavior is documented here as the contract: deleting a concert removes/cancels associated reservations atomically. (Alternative: `409` if active reservations exist — choose one and keep it consistent across code + this spec.)

---

## Reservations

### POST `/concerts/:id/reservations`
Reserve one seat for the current user. *(USER)* — **strict limit: 1 active seat per user per concert.**

**Request:** *(empty body)*

**201 Created**
```json
{
  "id": "uuid",
  "concertId": "uuid",
  "userId": "uuid",
  "status": "ACTIVE",
  "createdAt": "..."
}
```
**Errors:**
- `400` invalid concert id format.
- `401` no token · `403` not USER (e.g. ADMIN attempting to reserve).
- `404` concert not found.
- `409` `"Concert is sold out"` — no seats left.
- `409` `"You already have a reservation for this concert"` — duplicate.

Concurrency-safe: the seat counter is incremented atomically; over-booking is impossible (see [02-backend-spec.md](./02-backend-spec.md) §8).

---

### DELETE `/reservations/:id`
Cancel the current user's own reservation. *(USER)*

**200 OK**
```json
{ "id": "uuid", "status": "CANCELLED", "cancelledAt": "..." }
```
- Sets status to `CANCELLED`, returns the seat to the pool (`reservedSeats--`).
- Idempotent: cancelling an already-cancelled reservation returns `200` with the same state.

**Errors:** `401` · `403` not the owner · `404` reservation not found.

---

### GET `/reservations/me`
List the current user's own reservations (history). *(USER)*

**200 OK**
```json
[
  {
    "id": "uuid",
    "status": "ACTIVE",
    "createdAt": "...",
    "cancelledAt": null,
    "concert": { "id": "uuid", "name": "Summer Live" }
  }
]
```
**Errors:** `401`.

---

### GET `/admin/reservations`
Audit trail — **all** users' reservation events. *(ADMIN)* — backs the **History** table (Date time, Username, Concert name, Action).

Reads from the append-only event log, so a reserve→cancel sequence appears as **two rows**.

**Query params:** `concertId?`, `action?` (`RESERVE|CANCEL`), `page?` (default 1), `pageSize?` (default 20, max 100).

**200 OK**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "CANCEL",
      "createdAt": "2024-09-12T15:00:00.000Z",
      "user": { "id": "uuid", "name": "Sara John" },
      "concert": { "id": "uuid", "name": "The festival Int 2024" }
    },
    {
      "id": "uuid",
      "action": "RESERVE",
      "createdAt": "2024-09-12T10:39:20.000Z",
      "user": { "id": "uuid", "name": "Sara John" },
      "concert": { "id": "uuid", "name": "The festival Int 2024" }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 2
}
```
**Errors:** `401` · `403` not ADMIN.

---

### GET `/admin/stats`
Dashboard counters for the Admin Overview. *(ADMIN)* — backs the three stat cards (Total of seats / Reserve / Cancel).

**200 OK**
```json
{ "totalSeats": 500, "totalReserved": 120, "totalCancelled": 12 }
```
- `totalSeats` = sum of all concerts' `totalSeats`.
- `totalReserved` = currently-active reserved seats (sum of `reservedSeats`).
- `totalCancelled` = count of `CANCEL` events. *(See [02-backend-spec.md](./02-backend-spec.md) §6.3 — confirm whether "Reserve" means active vs. ever-reserved and keep it consistent.)*

**Errors:** `401` · `403` not ADMIN.

---

## Error Responses

All errors share this shape (from the global `HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["totalSeats must be a positive number"],
  "path": "/concerts",
  "timestamp": "2026-06-10T00:00:00.000Z"
}
```

`message` is a string (single error) or string[] (validation list).

| Status | When |
| --- | --- |
| `400 Bad Request` | DTO validation failed / malformed body |
| `401 Unauthorized` | Missing, expired, or invalid JWT |
| `403 Forbidden` | Authenticated but wrong role, or not the resource owner |
| `404 Not Found` | Concert/reservation does not exist |
| `409 Conflict` | Sold out, duplicate reservation, duplicate email |
| `500 Internal Server Error` | Unexpected failure |

---

## Endpoint Index

| Method | Path | Access | Spec |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | [↑](#post-authregister) |
| POST | `/auth/login` | Public | [↑](#post-authlogin) |
| GET | `/auth/me` | Auth | [↑](#get-authme) |
| GET | `/concerts` | Auth | [↑](#get-concerts) |
| POST | `/concerts` | ADMIN | [↑](#post-concerts) |
| DELETE | `/concerts/:id` | ADMIN | [↑](#delete-concertsid) |
| POST | `/concerts/:id/reservations` | USER | [↑](#post-concertsidreservations) |
| DELETE | `/reservations/:id` | USER | [↑](#delete-reservationsid) |
| GET | `/reservations/me` | USER | [↑](#get-reservationsme) |
| GET | `/admin/reservations` | ADMIN | [↑](#get-adminreservations) |
| GET | `/admin/stats` | ADMIN | [↑](#get-adminstats) |
