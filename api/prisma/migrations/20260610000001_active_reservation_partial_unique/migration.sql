-- Enforce "1 active reservation per user per concert" at the DB level.
-- Prisma lacks native partial-index support, so this is applied via raw SQL.
-- A user may reserve -> cancel -> reserve again because only ACTIVE rows are constrained.
CREATE UNIQUE INDEX "Reservation_userId_concertId_active_key"
  ON "Reservation" ("userId", "concertId")
  WHERE "status" = 'ACTIVE';
