import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Blocks a user flagged `mustChangePassword` from reaching any route except the
 * ones marked @AllowPasswordChange(). The flag is read from the DB (the
 * authoritative source) rather than the JWT, so it reflects reality the instant
 * the password is changed — a bearer token can't be trusted for revocable state.
 *
 * Runs after the global JwtAuthGuard, so `req.user` is already populated for
 * protected routes; public routes have no user and are out of scope.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();
    if (!user) {
      return true;
    }

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mustChangePassword: true },
    });
    if (record?.mustChangePassword) {
      throw new ForbiddenException(
        'You must change your password before continuing',
      );
    }
    return true;
  }
}
