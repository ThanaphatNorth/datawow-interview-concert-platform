import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    listAdmins: jest.Mock;
    createAdmin: jest.Mock;
    deleteAdmin: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listAdmins: jest.fn(),
      createAdmin: jest.fn(),
      deleteAdmin: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();
    controller = moduleRef.get(UsersController);
  });

  it('list() delegates to UsersService.listAdmins', async () => {
    service.listAdmins.mockResolvedValue([]);
    await controller.list();
    expect(service.listAdmins).toHaveBeenCalled();
  });

  it('create() delegates the DTO to UsersService.createAdmin', async () => {
    const dto = { name: 'New', email: 'new@example.com', password: 'Temp12345' };
    service.createAdmin.mockResolvedValue({ id: 'a2' });
    await controller.create(dto);
    expect(service.createAdmin).toHaveBeenCalledWith(dto);
  });

  it('remove() passes the target id and the current admin id', async () => {
    const user: AuthUser = { id: 'a1', email: 'a@example.com', role: 'ADMIN' };
    service.deleteAdmin.mockResolvedValue({ id: 'a2' });
    await controller.remove('a2', user);
    expect(service.deleteAdmin).toHaveBeenCalledWith('a2', 'a1');
  });
});
