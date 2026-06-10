import { JwtStrategy, JwtPayload } from './jwt.strategy';

/**
 * validate()'s return value is attached to req.user, so it must map the JWT
 * payload (sub/email/role) into the AuthUser shape (id/email/role).
 */
describe('JwtStrategy', () => {
  it('maps the JWT payload onto req.user (sub -> id) carrying the role', () => {
    const strategy = new JwtStrategy();
    const payload: JwtPayload = {
      sub: 'u1',
      email: 'user@example.com',
      role: 'USER',
    };

    expect(strategy.validate(payload)).toEqual({
      id: 'u1',
      email: 'user@example.com',
      role: 'USER',
    });
  });

  it('preserves an ADMIN role for downstream RolesGuard checks', () => {
    const strategy = new JwtStrategy();
    const result = strategy.validate({
      sub: 'a1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    expect(result.role).toBe('ADMIN');
  });
});
