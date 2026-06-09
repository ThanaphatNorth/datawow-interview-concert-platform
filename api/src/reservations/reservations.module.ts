import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { AdminController } from './admin.controller';

@Module({
  controllers: [ReservationsController, AdminController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
