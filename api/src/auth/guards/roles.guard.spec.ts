import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from './roles.guard';

function contextWithUser(role?: Role): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser(Role.USER))).toBe(true);
  });

  it('denies a USER token on an ADMIN route (403, never 200)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(() => guard.canActivate(contextWithUser(Role.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an ADMIN token on an ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(contextWithUser(Role.ADMIN))).toBe(true);
  });

  it('denies an ADMIN token on a USER-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.USER]);
    expect(() => guard.canActivate(contextWithUser(Role.ADMIN))).toThrow(
      ForbiddenException,
    );
  });
});
