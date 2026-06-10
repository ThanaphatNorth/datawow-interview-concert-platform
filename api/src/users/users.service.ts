import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

const SALT_ROUNDS = 10;

// Fields safe to return to the client (never the password hash).
const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all admin accounts, oldest first. */
  listAdmins() {
    return this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: ADMIN_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Provision a new admin. The password is a temporary one: the account is
   * flagged `mustChangePassword` so it must be reset on first login.
   */
  async createAdmin(dto: CreateAdminDto) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.ADMIN,
          mustChangePassword: true,
        },
        select: ADMIN_SELECT,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  /**
   * Remove an admin. Guards: an admin can't delete their own account, and the
   * last remaining admin can't be removed (so the system always has one).
   */
  async deleteAdmin(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== Role.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    const adminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });
    if (adminCount <= 1) {
      throw new ForbiddenException('Cannot delete the last admin');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      // Foreign-key violation: the admin still has activity referencing them.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException('Cannot delete an admin with existing activity');
      }
      throw e;
    }
    return { id };
  }
}
