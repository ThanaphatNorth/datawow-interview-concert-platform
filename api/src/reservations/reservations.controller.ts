import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Roles(Role.USER)
@UseGuards(RolesGuard)
@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('concerts/:id/reservations')
  @HttpCode(HttpStatus.CREATED)
  reserve(@CurrentUser('id') userId: string, @Param('id') concertId: string) {
    return this.reservationsService.reserve(userId, concertId);
  }

  @Delete('reservations/:id')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reservationsService.cancel(userId, id);
  }

  @Get('reservations/me')
  findMine(@CurrentUser('id') userId: string) {
    return this.reservationsService.findMine(userId);
  }
}
