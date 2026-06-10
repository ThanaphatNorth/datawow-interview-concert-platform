import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthUser } from './decorators/current-user.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
    getProfile: jest.Mock;
    changePassword: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      getProfile: jest.fn(),
      changePassword: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AuthController);
  });

  it('register() delegates the DTO to AuthService.register', async () => {
    const dto = { name: 'Sara', email: 'sara@example.com', password: 'secret123' };
    service.register.mockResolvedValue({ accessToken: 't', user: {} });

    await controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('login() delegates the DTO to AuthService.login', async () => {
    const dto = { email: 'sara@example.com', password: 'secret123' };
    service.login.mockResolvedValue({ accessToken: 't', user: {} });

    await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('me() fetches the profile for the authenticated user id', async () => {
    const user: AuthUser = { id: 'u1', email: 'u@example.com', role: 'USER' };
    service.getProfile.mockResolvedValue({ id: 'u1' });

    await controller.me(user);

    expect(service.getProfile).toHaveBeenCalledWith('u1');
  });

  it('changePassword() applies the new password for the authenticated user', async () => {
    const user: AuthUser = { id: 'a1', email: 'a@example.com', role: 'ADMIN' };
    service.changePassword.mockResolvedValue({ id: 'a1', mustChangePassword: false });

    await controller.changePassword(user, { newPassword: 'BrandNew123' });

    expect(service.changePassword).toHaveBeenCalledWith('a1', 'BrandNew123');
  });
});
