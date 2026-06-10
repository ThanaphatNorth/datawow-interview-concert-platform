import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  createAdminSchema,
  createConcertSchema,
} from '../schemas';

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty email and a malformed email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const base = {
    name: 'Sara',
    email: 'sara@example.com',
    password: 'Secret12',
    confirmPassword: 'Secret12',
  };

  it('accepts matching passwords of >= 8 chars', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('flags confirmPassword when the two passwords differ', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'Different9' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toMatch(/match/i);
    }
  });

  it('rejects a password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password missing the required complexity', () => {
    // long enough, but no uppercase and no number
    const result = registerSchema.safeParse({
      ...base,
      password: 'alllowercase',
      confirmPassword: 'alllowercase',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts matching new passwords of >= 8 chars', () => {
    expect(
      changePasswordSchema.safeParse({ newPassword: 'BrandNew123', confirmPassword: 'BrandNew123' })
        .success,
    ).toBe(true);
  });

  it('flags confirmPassword when the two differ', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'BrandNew123',
      confirmPassword: 'Different123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toMatch(/match/i);
    }
  });

  it('rejects a new password shorter than 8 chars', () => {
    expect(
      changePasswordSchema.safeParse({ newPassword: 'short', confirmPassword: 'short' }).success,
    ).toBe(false);
  });

  it('rejects a new password missing the required complexity', () => {
    // long enough, but no uppercase and no number
    expect(
      changePasswordSchema.safeParse({
        newPassword: 'alllowercase',
        confirmPassword: 'alllowercase',
      }).success,
    ).toBe(false);
  });
});

describe('createAdminSchema', () => {
  const base = { name: 'New Admin', email: 'new@example.com', password: 'Temp12345' };

  it('accepts a valid admin payload', () => {
    expect(createAdminSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty name, a bad email, and a short password', () => {
    expect(createAdminSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(createAdminSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
    expect(createAdminSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });
});

describe('createConcertSchema', () => {
  it('coerces a numeric string for totalSeats', () => {
    const result = createConcertSchema.safeParse({
      name: 'Live',
      description: 'desc',
      totalSeats: '120',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totalSeats).toBe(120);
  });

  it('rejects zero/negative and non-integer seats', () => {
    const make = (totalSeats: unknown) =>
      createConcertSchema.safeParse({ name: 'L', description: 'd', totalSeats }).success;
    expect(make(0)).toBe(false);
    expect(make(-3)).toBe(false);
    expect(make(2.5)).toBe(false);
  });

  it('rejects a name over 120 chars and an empty description', () => {
    expect(
      createConcertSchema.safeParse({
        name: 'x'.repeat(121),
        description: 'd',
        totalSeats: 10,
      }).success,
    ).toBe(false);
    expect(
      createConcertSchema.safeParse({ name: 'L', description: '', totalSeats: 10 }).success,
    ).toBe(false);
  });
});
