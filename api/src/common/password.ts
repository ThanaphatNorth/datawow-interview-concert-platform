import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const SALT_ROUNDS = 10;

/** Password policy: at least one lowercase letter, one uppercase letter, and one number. */
export const PASSWORD_POLICY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
export const PASSWORD_POLICY_MESSAGE =
  'Password must include an uppercase letter, a lowercase letter, and a number';

/** Hash a plaintext password with the shared cost factor. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Map a Prisma unique-constraint (P2002) failure to a 409 Conflict; rethrow
 * anything else unchanged. Always throws — return type is `never`.
 */
export function rethrowDuplicateEmail(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('Email already registered');
  }
  throw e;
}
