import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and signs a JWT containing the role', async () => {
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'u1',
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: Role.USER,
      }));

      const result = await service.register({
        name: 'Sara John',
        email: 'user@example.com',
        password: 'secret123',
      });

      // password was hashed (not stored in plaintext)
      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(stored).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', stored)).toBe(true);

      // JWT payload carries the role
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'user@example.com',
        role: Role.USER,
      });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 'u1',
        name: 'Sara John',
        email: 'user@example.com',
        role: Role.USER,
      });
    });

    it('throws 409 when email already exists', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );

      await expect(
        service.register({
          name: 'X',
          email: 'dup@example.com',
          password: 'secret123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token with role for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@example.com',
        name: 'Admin',
        passwordHash,
        role: Role.ADMIN,
      });

      const result = await service.login({
        email: 'admin@example.com',
        password: 'secret123',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
      expect(result.user.role).toBe(Role.ADMIN);
    });

    it('throws 401 for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@example.com',
        name: 'Admin',
        passwordHash,
        role: Role.ADMIN,
      });

      await expect(
        service.login({ email: 'admin@example.com', password: 'wrongpass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws 401 for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
