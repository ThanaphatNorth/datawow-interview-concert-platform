import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAdminDto } from './create-admin.dto';

async function propsFailing(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateAdminDto, payload));
  return errors.map((e) => e.property);
}

describe('CreateAdminDto validation', () => {
  it('accepts a valid admin payload', async () => {
    expect(
      await propsFailing({ name: 'New Admin', email: 'new@example.com', password: 'Temp12345' }),
    ).toEqual([]);
  });

  it('rejects an empty name', async () => {
    expect(
      await propsFailing({ name: '', email: 'new@example.com', password: 'Temp12345' }),
    ).toContain('name');
  });

  it('rejects a malformed email', async () => {
    expect(
      await propsFailing({ name: 'New', email: 'nope', password: 'Temp12345' }),
    ).toContain('email');
  });

  it('rejects a password shorter than 8 chars', async () => {
    expect(
      await propsFailing({ name: 'New', email: 'new@example.com', password: 'short' }),
    ).toContain('password');
  });
});
