import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
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
        mustChangePassword: false,
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
        mustChangePassword: false,
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
        mustChangePassword: true,
      });

      const result = await service.login({
        email: 'admin@example.com',
        password: 'secret123',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
      expect(result.user.role).toBe(Role.ADMIN);
      // The flag flows through so the client can force a first-login change.
      expect(result.user.mustChangePassword).toBe(true);
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

  describe('getProfile', () => {
    it('returns the safe profile fields (never the password hash)', async () => {
      const profile = {
        id: 'u1',
        name: 'Sara',
        email: 'sara@example.com',
        role: Role.USER,
      };
      prisma.user.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile('u1');

      expect(result).toEqual(profile);
      // The select must exclude passwordHash.
      const selectArg = prisma.user.findUnique.mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('passwordHash');
    });

    it('throws 404 when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('hashes the new password and clears the must-change flag', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'new-admin@example.com',
        name: 'New Admin',
        passwordHash: 'old-hash',
        role: Role.ADMIN,
        mustChangePassword: true,
      });
      prisma.user.update.mockImplementation(async ({ data }) => ({
        id: 'a1',
        email: 'new-admin@example.com',
        name: 'New Admin',
        passwordHash: data.passwordHash,
        role: Role.ADMIN,
        mustChangePassword: data.mustChangePassword,
      }));

      const result = await service.changePassword('a1', 'BrandNew123');

      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'a1' });
      expect(updateArg.data.mustChangePassword).toBe(false);
      // New password is hashed, never stored as plaintext.
      expect(updateArg.data.passwordHash).not.toBe('BrandNew123');
      expect(await bcrypt.compare('BrandNew123', updateArg.data.passwordHash)).toBe(true);
      expect(result.mustChangePassword).toBe(false);
    });

    it('rejects reusing the current password (never touches the DB)', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'new-admin@example.com',
        name: 'New Admin',
        passwordHash,
        role: Role.ADMIN,
        mustChangePassword: true,
      });

      await expect(
        service.changePassword('a1', 'Password123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws 404 when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('ghost', 'BrandNew123'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
