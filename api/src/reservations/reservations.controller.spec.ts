import { Test } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: {
    reserve: jest.Mock;
    cancel: jest.Mock;
    findMine: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      reserve: jest.fn(),
      cancel: jest.fn(),
      findMine: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [{ provide: ReservationsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ReservationsController);
  });

  it('reserve() forwards (userId, concertId) in the correct order', async () => {
    service.reserve.mockResolvedValue({ id: 'r1' });

    await controller.reserve('u1', 'c1');

    expect(service.reserve).toHaveBeenCalledWith('u1', 'c1');
  });

  it('cancel() forwards (userId, reservationId)', async () => {
    service.cancel.mockResolvedValue({ id: 'r1', status: 'CANCELLED' });

    await controller.cancel('u1', 'r1');

    expect(service.cancel).toHaveBeenCalledWith('u1', 'r1');
  });

  it('findMine() scopes the lookup to the current user only', async () => {
    service.findMine.mockResolvedValue([]);

    await controller.findMine('u1');

    expect(service.findMine).toHaveBeenCalledWith('u1');
  });
});
