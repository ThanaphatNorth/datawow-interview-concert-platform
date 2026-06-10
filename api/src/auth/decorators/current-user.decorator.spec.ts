import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser, AuthUser } from './current-user.decorator';

/**
 * Param decorators can't be invoked directly; we extract the underlying factory
 * from the route-args metadata (the standard NestJS testing recipe), then call
 * it with a faked ExecutionContext.
 */
function getFactory(decorator: (...args: any[]) => ParameterDecorator) {
  class Probe {
    handler(@decorator() _user: unknown) {
      return _user;
    }
  }
  const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
  return meta[Object.keys(meta)[0]].factory as (
    data: unknown,
    ctx: ExecutionContext,
  ) => unknown;
}

function ctxWith(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const factory = getFactory(CurrentUser);
  const user: AuthUser = { id: 'u1', email: 'u@example.com', role: 'USER' };

  it('returns the whole user when no field is requested', () => {
    expect(factory(undefined, ctxWith(user))).toEqual(user);
  });

  it('returns a single field when one is requested', () => {
    expect(factory('id', ctxWith(user))).toBe('u1');
    expect(factory('role', ctxWith(user))).toBe('USER');
  });

  it('returns undefined safely when no user is attached to the request', () => {
    expect(factory('id', ctxWith(undefined))).toBeUndefined();
    expect(factory(undefined, ctxWith(undefined))).toBeUndefined();
  });
});
