import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReservationAction,
  ReservationStatus,
} from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;

  // A tx object whose methods mirror the ones used inside reserve().
  let tx: any;

  beforeEach(async () => {
    tx = {
      $executeRaw: jest.fn(),
      reservation: { create: jest.fn() },
      reservationEvent: { create: jest.fn() },
    };

    prisma = {
      concert: { findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
      reservation: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      reservationEvent: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      // $transaction: callback form for reserve(), array form for cancel()/stats.
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ReservationsService);
  });

  describe('reserve', () => {
    beforeEach(() => {
      // Default: run the callback form against `tx`.
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    });

    it('reserves a seat and writes a RESERVE event (success)', async () => {
      prisma.concert.findUnique.mockResolvedValue({ id: 'c1' });
      tx.$executeRaw.mockResolvedValue(1); // 1 row updated => seat secured
      tx.reservation.create.mockResolvedValue({
        id: 'r1',
        concertId: 'c1',
        userId: 'u1',
        status: ReservationStatus.ACTIVE,
        createdAt: new Date(),
      });

      const result = await service.reserve('u1', 'c1');

      expect(result).toMatchObject({ id: 'r1', status: 'ACTIVE' });
      expect(tx.reservationEvent.create).toHaveBeenCalledWith({
        data: { userId: 'u1', concertId: 'c1', action: ReservationAction.RESERVE },
      });
    });

    it('throws 404 when concert does not exist', async () => {
      prisma.concert.findUnique.mockResolvedValue(null);
      await expect(service.reserve('u1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws 409 when the concert is full (atomic update affects 0 rows)', async () => {
      prisma.concert.findUnique.mockResolvedValue({ id: 'c1' });
      tx.$executeRaw.mockResolvedValue(0); // sold out => no row updated

      await expect(service.reserve('u1', 'c1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.reservation.create).not.toHaveBeenCalled();
    });

    it('throws 409 on duplicate reservation (partial unique index violation)', async () => {
      prisma.concert.findUnique.mockResolvedValue({ id: 'c1' });
      tx.$executeRaw.mockResolvedValue(1);
      tx.reservation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );

      await expect(service.reserve('u1', 'c1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('cancel', () => {
    it('cancels an active reservation: status CANCELLED + seat returned + CANCEL event', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        concertId: 'c1',
        status: ReservationStatus.ACTIVE,
        cancelledAt: null,
      });
      prisma.$transaction.mockResolvedValue([
        { id: 'r1', status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
        {},
        {},
      ]);

      const result = await service.cancel('u1', 'r1');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws 404 when reservation does not exist', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.cancel('u1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws 403 when a non-owner tries to cancel', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'owner',
        concertId: 'c1',
        status: ReservationStatus.ACTIVE,
        cancelledAt: null,
      });

      await expect(service.cancel('intruder', 'r1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('is idempotent: already-cancelled returns same state, no decrement, no event', async () => {
      const cancelledAt = new Date('2026-06-10T00:00:00.000Z');
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        concertId: 'c1',
        status: ReservationStatus.CANCELLED,
        cancelledAt,
      });

      const result = await service.cancel('u1', 'r1');

      expect(result).toEqual({
        id: 'r1',
        status: ReservationStatus.CANCELLED,
        cancelledAt,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns totalSeats, totalReserved (active), totalCancelled (CANCEL events)', async () => {
      prisma.$transaction.mockResolvedValue([
        { _sum: { totalSeats: 500, reservedSeats: 120 } },
        12,
      ]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalSeats: 500,
        totalReserved: 120,
        totalCancelled: 12,
      });
    });

    it('coalesces null sums to 0 when no concerts exist', async () => {
      prisma.$transaction.mockResolvedValue([
        { _sum: { totalSeats: null, reservedSeats: null } },
        0,
      ]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalSeats: 0,
        totalReserved: 0,
        totalCancelled: 0,
      });
    });
  });

  describe('findMine', () => {
    it("returns the user's own reservations newest-first, scoped by userId", async () => {
      const rows = [
        {
          id: 'r2',
          status: ReservationStatus.ACTIVE,
          createdAt: new Date(),
          cancelledAt: null,
          concert: { id: 'c2', name: 'B' },
        },
        {
          id: 'r1',
          status: ReservationStatus.CANCELLED,
          createdAt: new Date(),
          cancelledAt: new Date(),
          concert: { id: 'c1', name: 'A' },
        },
      ];
      prisma.reservation.findMany.mockResolvedValue(rows);

      const result = await service.findMine('u1');

      expect(result).toBe(rows);
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findAllEvents', () => {
    it('defaults to page 1 / pageSize 20 with an empty filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAllEvents({});

      expect(result).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
      const findManyArg = prisma.reservationEvent.findMany.mock.calls[0][0];
      expect(findManyArg).toMatchObject({ skip: 0, take: 20, where: {} });
    });

    it('applies concertId + action filters and derives skip from the page', async () => {
      const rows = [{ id: 'e1', action: ReservationAction.RESERVE }];
      prisma.$transaction.mockResolvedValue([rows, 42]);

      const result = await service.findAllEvents({
        page: 3,
        pageSize: 10,
        concertId: 'c1',
        action: ReservationAction.RESERVE,
      });

      expect(result).toEqual({ data: rows, page: 3, pageSize: 10, total: 42 });
      const findManyArg = prisma.reservationEvent.findMany.mock.calls[0][0];
      expect(findManyArg).toMatchObject({
        skip: 20, // (3 - 1) * 10
        take: 10,
        where: { concertId: 'c1', action: ReservationAction.RESERVE },
      });
    });
  });
});
