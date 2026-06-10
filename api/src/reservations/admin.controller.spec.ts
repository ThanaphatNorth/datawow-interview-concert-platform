import { Test } from '@nestjs/testing';
import { ReservationAction } from '@prisma/client';
import { AdminController } from './admin.controller';
import { ReservationsService } from './reservations.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: { findAllEvents: jest.Mock; getStats: jest.Mock };

  beforeEach(async () => {
    service = { findAllEvents: jest.fn(), getStats: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: ReservationsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AdminController);
  });

  it('findAllEvents() forwards the query filters to the service', async () => {
    const query = { page: 2, pageSize: 50, action: ReservationAction.CANCEL };
    service.findAllEvents.mockResolvedValue({ data: [], page: 2, pageSize: 50, total: 0 });

    await controller.findAllEvents(query);

    expect(service.findAllEvents).toHaveBeenCalledWith(query);
  });

  it('getStats() delegates to the service', async () => {
    service.getStats.mockResolvedValue({ totalSeats: 0, totalReserved: 0, totalCancelled: 0 });

    await controller.getStats();

    expect(service.getStats).toHaveBeenCalled();
  });
});
