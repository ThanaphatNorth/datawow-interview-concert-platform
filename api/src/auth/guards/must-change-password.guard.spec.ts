import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new MustChangePasswordGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );
  });

  function context(user?: unknown): ExecutionContext {
    return {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows routes marked @AllowPasswordChange() without touching the DB', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(context({ id: 'a1' }))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('passes through public routes that have no authenticated user', async () => {
    await expect(guard.canActivate(context(undefined))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks a user still flagged mustChangePassword', async () => {
    prisma.user.findUnique.mockResolvedValue({ mustChangePassword: true });

    await expect(guard.canActivate(context({ id: 'a1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      select: { mustChangePassword: true },
    });
  });

  it('allows a user whose flag has cleared', async () => {
    prisma.user.findUnique.mockResolvedValue({ mustChangePassword: false });

    await expect(guard.canActivate(context({ id: 'a1' }))).resolves.toBe(true);
  });

  it('allows when the user record is gone (no flag to enforce)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context({ id: 'ghost' }))).resolves.toBe(true);
  });
});
