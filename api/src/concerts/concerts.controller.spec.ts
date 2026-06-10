import { Test } from '@nestjs/testing';
import { ConcertsController } from './concerts.controller';
import { ConcertsService } from './concerts.service';
import { Role } from '../common/enums/role.enum';
import { AuthUser } from '../auth/decorators/current-user.decorator';

describe('ConcertsController', () => {
  let controller: ConcertsController;
  let service: { findAll: jest.Mock; create: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ConcertsController],
      providers: [{ provide: ConcertsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ConcertsController);
  });

  it('findAll() passes the current user through (so USER gets myReservation)', async () => {
    const user: AuthUser = { id: 'u1', email: 'u@example.com', role: Role.USER };
    service.findAll.mockResolvedValue([]);

    await controller.findAll(user);

    expect(service.findAll).toHaveBeenCalledWith(user);
  });

  it('create() delegates the DTO to the service', async () => {
    const dto = { name: 'Live', description: 'd', totalSeats: 100 };
    service.create.mockResolvedValue({ id: 'c1' });

    await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('remove() delegates the id to the service', async () => {
    service.remove.mockResolvedValue({ id: 'c1', deleted: true });

    await controller.remove('c1');

    expect(service.remove).toHaveBeenCalledWith('c1');
  });
});
