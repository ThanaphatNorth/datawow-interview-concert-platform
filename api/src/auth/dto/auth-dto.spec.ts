import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';
import { ChangePasswordDto } from './change-password.dto';

async function propsFailing(cls: any, payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(cls, payload));
  return errors.map((e) => e.property);
}

describe('RegisterDto validation', () => {
  it('accepts a valid registration', async () => {
    expect(
      await propsFailing(RegisterDto, {
        name: 'Sara John',
        email: 'sara@example.com',
        password: 'Secret123',
      }),
    ).toEqual([]);
  });

  it('rejects an empty name', async () => {
    expect(
      await propsFailing(RegisterDto, {
        name: '',
        email: 'sara@example.com',
        password: 'Secret123',
      }),
    ).toContain('name');
  });

  it('rejects a malformed email', async () => {
    expect(
      await propsFailing(RegisterDto, {
        name: 'Sara',
        email: 'not-an-email',
        password: 'Secret123',
      }),
    ).toContain('email');
  });

  it('rejects a password shorter than 8 chars', async () => {
    expect(
      await propsFailing(RegisterDto, {
        name: 'Sara',
        email: 'sara@example.com',
        password: 'short',
      }),
    ).toContain('password');
  });

  it('rejects a password missing the required complexity', async () => {
    // long enough, but no uppercase and no number
    expect(
      await propsFailing(RegisterDto, {
        name: 'Sara',
        email: 'sara@example.com',
        password: 'alllowercase',
      }),
    ).toContain('password');
  });
});

describe('LoginDto validation', () => {
  it('accepts valid credentials', async () => {
    expect(
      await propsFailing(LoginDto, { email: 'sara@example.com', password: 'secret123' }),
    ).toEqual([]);
  });

  it('rejects a malformed email', async () => {
    expect(
      await propsFailing(LoginDto, { email: 'bad', password: 'secret123' }),
    ).toContain('email');
  });

  it('rejects a too-short password', async () => {
    expect(
      await propsFailing(LoginDto, { email: 'sara@example.com', password: 'x' }),
    ).toContain('password');
  });
});

describe('ChangePasswordDto validation', () => {
  it('accepts a new password of at least 8 chars', async () => {
    expect(await propsFailing(ChangePasswordDto, { newPassword: 'BrandNew123' })).toEqual([]);
  });

  it('rejects a too-short new password', async () => {
    expect(await propsFailing(ChangePasswordDto, { newPassword: 'short' })).toContain(
      'newPassword',
    );
  });

  it('rejects a password missing the required complexity', async () => {
    // long enough, but no uppercase and no number
    expect(await propsFailing(ChangePasswordDto, { newPassword: 'alllowercase' })).toContain(
      'newPassword',
    );
  });
});
