import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('listAdmins', () => {
    it('queries only ADMIN users and never selects the password hash', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.listAdmins();

      const arg = prisma.user.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ role: Role.ADMIN });
      expect(arg.select).not.toHaveProperty('passwordHash');
    });
  });

  describe('createAdmin', () => {
    it('hashes the password and provisions an ADMIN that must change it', async () => {
      prisma.user.create.mockImplementation(async ({ data, select }) => ({
        id: 'a2',
        name: data.name,
        email: data.email,
        role: data.role,
        mustChangePassword: data.mustChangePassword,
        createdAt: new Date(),
        ...(select?.passwordHash ? { passwordHash: data.passwordHash } : {}),
      }));

      const result = await service.createAdmin({
        name: 'New Admin',
        email: 'new-admin@example.com',
        password: 'Temp12345',
      });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.role).toBe(Role.ADMIN);
      expect(data.mustChangePassword).toBe(true);
      expect(data.passwordHash).not.toBe('Temp12345');
      expect(await bcrypt.compare('Temp12345', data.passwordHash)).toBe(true);
      // Response is the safe projection, no hash.
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.mustChangePassword).toBe(true);
    });

    it('throws 409 when the email already exists', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );
      await expect(
        service.createAdmin({ name: 'X', email: 'dup@example.com', password: 'Temp12345' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteAdmin', () => {
    it('refuses to delete your own account', async () => {
      await expect(service.deleteAdmin('a1', 'a1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('throws 404 for a non-existent or non-admin target', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteAdmin('ghost', 'a1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      prisma.user.findUnique.mockResolvedValue({ id: 'u9', role: Role.USER });
      await expect(service.deleteAdmin('u9', 'a1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete the last remaining admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a2', role: Role.ADMIN });
      prisma.user.count.mockResolvedValue(1);
      await expect(service.deleteAdmin('a2', 'a1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes an admin when guards pass', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a2', role: Role.ADMIN });
      prisma.user.count.mockResolvedValue(2);
      prisma.user.delete.mockResolvedValue({ id: 'a2' });

      const result = await service.deleteAdmin('a2', 'a1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'a2' } });
      expect(result).toEqual({ id: 'a2' });
    });
  });
});
