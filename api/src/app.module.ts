import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConcertsModule } from './concerts/concerts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { MustChangePasswordGuard } from './auth/guards/must-change-password.guard';

@Module({
  imports: [PrismaModule, AuthModule, ConcertsModule, ReservationsModule, UsersModule],
  providers: [
    // Global JWT auth — every route is protected unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Runs after auth: a user who still must change their password can only reach
    // routes marked @AllowPasswordChange() until they do.
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
  ],
})
export class AppModule {}
