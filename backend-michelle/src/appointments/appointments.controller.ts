import { Controller, Get, Post, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto, UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('appointments')
@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una cita (ADMIN puede agendar a nombre de un paciente)' })
  create(@Body() body: CreateAppointmentDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.appointmentsService.create(body, request.user, request.ip);
  }

  @Get()
  @ApiOperation({ summary: 'Listar citas del usuario o toda la agenda para ADMIN' })
  findAll(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.appointmentsService.findAll(request.user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una cita propia o de la agenda para ADMIN' })
  cancel(
    @Param('id') id: string,
    @Body() body: CancelAppointmentDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.appointmentsService.cancel(id, request.user, body?.reason);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Confirmar o rechazar una cita (ADMIN), con aviso al paciente' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateAppointmentStatusDto) {
    return this.appointmentsService.updateStatus(id, body.status, body.reason);
  }
}
