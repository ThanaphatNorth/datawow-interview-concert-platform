import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { ListEventsDto } from './dto/list-events.dto';

@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('reservations')
  findAllEvents(@Query() query: ListEventsDto) {
    return this.reservationsService.findAllEvents(query);
  }

  @Get('stats')
  getStats() {
    return this.reservationsService.getStats();
  }
}
