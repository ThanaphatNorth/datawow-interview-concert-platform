import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Role, ReservationStatus } from '@prisma/client';
import { ConcertsService } from './concerts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConcertsService', () => {
  let service: ConcertsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      concert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      reservation: { findMany: jest.fn(), deleteMany: jest.fn() },
      reservationEvent: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConcertsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConcertsService);
  });

  it('create() inserts and returns availability view', async () => {
    prisma.concert.create.mockResolvedValue({
      id: 'c1',
      name: 'Summer Live',
      description: 'Open-air',
      totalSeats: 500,
      reservedSeats: 0,
      createdAt: new Date('2026-06-10T00:00:00.000Z'),
    });

    const result = await service.create({
      name: 'Summer Live',
      description: 'Open-air',
      totalSeats: 500,
    });

    expect(result.availableSeats).toBe(500);
    expect(result.soldOut).toBe(false);
  });

  it('findAll() computes availableSeats and soldOut', async () => {
    prisma.concert.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'A',
        description: 'd',
        totalSeats: 10,
        reservedSeats: 10,
        createdAt: new Date(),
      },
      {
        id: 'c2',
        name: 'B',
        description: 'd',
        totalSeats: 10,
        reservedSeats: 3,
        createdAt: new Date(),
      },
    ]);

    const result = await service.findAll({ id: 'admin1', role: Role.ADMIN });

    expect(result[0]).toMatchObject({ availableSeats: 0, soldOut: true });
    expect(result[1]).toMatchObject({ availableSeats: 7, soldOut: false });
    // ADMIN never gets myReservation populated
    expect(result[0].myReservation).toBeNull();
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });

  it('findAll() attaches myReservation for USER with an active reservation', async () => {
    prisma.concert.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'A',
        description: 'd',
        totalSeats: 10,
        reservedSeats: 1,
        createdAt: new Date(),
      },
    ]);
    prisma.reservation.findMany.mockResolvedValue([
      { id: 'r1', concertId: 'c1', status: ReservationStatus.ACTIVE },
    ]);

    const result = await service.findAll({ id: 'u1', role: Role.USER });

    expect(result[0].myReservation).toEqual({ id: 'r1', status: 'ACTIVE' });
  });

  it('remove() throws 404 when concert is missing', async () => {
    prisma.concert.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() cascade-deletes within a transaction', async () => {
    prisma.concert.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.remove('c1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual({ id: 'c1', deleted: true });
  });
});
