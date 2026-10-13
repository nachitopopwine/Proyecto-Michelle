import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('schedule')
@ApiTags('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Bloques disponibles de los próximos días (público)' })
  availability() {
    return this.scheduleService.getAvailability();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Horario de atención configurado' })
  settings() {
    return this.scheduleService.getSettings();
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar el horario de atención (ADMIN)' })
  update(@Body() body: UpdateScheduleDto) {
    return this.scheduleService.updateSettings(body);
  }
}
