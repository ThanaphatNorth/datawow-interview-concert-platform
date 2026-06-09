import { Injectable, NotFoundException } from '@nestjs/common';
import { Concert, ReservationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConcertDto } from './dto/create-concert.dto';

@Injectable()
export class ConcertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConcertDto) {
    const concert = await this.prisma.concert.create({
      data: {
        name: dto.name,
        description: dto.description,
        totalSeats: dto.totalSeats,
      },
    });
    return this.toView(concert);
  }

  /**
   * Lists all concerts (incl. sold out) with computed availability.
   * For USER tokens, attaches `myReservation` when an ACTIVE reservation exists.
   */
  async findAll(user: { id: string; role: string }) {
    const concerts = await this.prisma.concert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let activeByConcert = new Map<string, { id: string; status: string }>();
    if (user.role === Role.USER) {
      const mine = await this.prisma.reservation.findMany({
        where: { userId: user.id, status: ReservationStatus.ACTIVE },
        select: { id: true, concertId: true, status: true },
      });
      activeByConcert = new Map(
        mine.map((r) => [r.concertId, { id: r.id, status: r.status }]),
      );
    }

    return concerts.map((c) => ({
      ...this.toView(c),
      myReservation:
        user.role === Role.USER ? activeByConcert.get(c.id) ?? null : null,
    }));
  }

  /** Cascade delete: removes a concert and its reservations/events atomically. */
  async remove(id: string) {
    const concert = await this.prisma.concert.findUnique({ where: { id } });
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    await this.prisma.$transaction([
      this.prisma.reservationEvent.deleteMany({ where: { concertId: id } }),
      this.prisma.reservation.deleteMany({ where: { concertId: id } }),
      this.prisma.concert.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  private toView(c: Concert) {
    const availableSeats = c.totalSeats - c.reservedSeats;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      totalSeats: c.totalSeats,
      reservedSeats: c.reservedSeats,
      availableSeats,
      soldOut: availableSeats === 0,
      createdAt: c.createdAt,
    };
  }
}
