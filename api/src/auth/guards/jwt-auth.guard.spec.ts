import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function context(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('bypasses authentication for @Public() routes (returns true without calling passport)', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(true);

    expect(guard.canActivate(context())).toBe(true);
    expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });

  it('delegates to the passport jwt guard when the route is not public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    // Stub the AuthGuard('jwt') base implementation that canActivate falls through to.
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    const superSpy = jest
      .spyOn(proto, 'canActivate')
      .mockReturnValue('delegated' as any);

    expect(guard.canActivate(context())).toBe('delegated');
    expect(superSpy).toHaveBeenCalled();
    superSpy.mockRestore();
  });
});
