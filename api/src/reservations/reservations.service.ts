import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReservationAction,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListEventsDto } from './dto/list-events.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Concurrency-safe reservation (see backend-spec §8).
   * 1. Atomic conditional increment: only succeeds while seats remain.
   *    0 rows affected => sold out => 409.
   * 2. Insert ACTIVE reservation; the partial unique index rejects a second
   *    active seat for the same user => 409 (and the tx rolls back the increment).
   * 3. Append a RESERVE audit event in the same transaction.
   */
  async reserve(userId: string, concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true },
    });
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const affected = await tx.$executeRaw`
          UPDATE "Concert"
          SET "reservedSeats" = "reservedSeats" + 1
          WHERE "id" = ${concertId} AND "reservedSeats" < "totalSeats"
        `;

        if (affected === 0) {
          throw new ConflictException('Concert is sold out');
        }

        const reservation = await tx.reservation.create({
          data: {
            userId,
            concertId,
            status: ReservationStatus.ACTIVE,
          },
        });

        await tx.reservationEvent.create({
          data: { userId, concertId, action: ReservationAction.RESERVE },
        });

        return {
          id: reservation.id,
          concertId: reservation.concertId,
          userId: reservation.userId,
          status: reservation.status,
          createdAt: reservation.createdAt,
        };
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already have a reservation for this concert',
        );
      }
      throw e;
    }
  }

  /**
   * Cancel the user's own reservation. 403 if not owner, 404 if missing.
   * Idempotent: an already-cancelled reservation returns its current state
   * with no seat decrement and no duplicate event.
   */
  async cancel(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.userId !== userId) {
      throw new ForbiddenException('Not the owner of this reservation');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return {
        id: reservation.id,
        status: reservation.status,
        cancelledAt: reservation.cancelledAt,
      };
    }

    const cancelledAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED, cancelledAt },
      }),
      this.prisma.concert.update({
        where: { id: reservation.concertId },
        data: { reservedSeats: { decrement: 1 } },
      }),
      this.prisma.reservationEvent.create({
        data: {
          userId,
          concertId: reservation.concertId,
          action: ReservationAction.CANCEL,
        },
      }),
    ]);

    return {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt,
    };
  }

  /** Current-state reservation history for a user. */
  async findMine(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        concert: { select: { id: true, name: true } },
      },
    });
    return reservations;
  }

  /** Admin audit trail from the append-only event log, newest first, paginated. */
  async findAllEvents(filters: ListEventsDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where: Prisma.ReservationEventWhereInput = {
      ...(filters.concertId ? { concertId: filters.concertId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reservationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          concert: { select: { id: true, name: true } },
        },
      }),
      this.prisma.reservationEvent.count({ where }),
    ]);

    return { data: rows, page, pageSize, total };
  }

  /**
   * Admin dashboard counters.
   * - totalSeats: SUM(Concert.totalSeats)
   * - totalReserved: SUM(Concert.reservedSeats) (currently-active seats)
   * - totalCancelled: COUNT(ReservationEvent WHERE action = CANCEL)
   */
  async getStats() {
    const [agg, totalCancelled] = await this.prisma.$transaction([
      this.prisma.concert.aggregate({
        _sum: { totalSeats: true, reservedSeats: true },
      }),
      this.prisma.reservationEvent.count({
        where: { action: ReservationAction.CANCEL },
      }),
    ]);

    return {
      totalSeats: agg._sum.totalSeats ?? 0,
      totalReserved: agg._sum.reservedSeats ?? 0,
      totalCancelled,
    };
  }
}
