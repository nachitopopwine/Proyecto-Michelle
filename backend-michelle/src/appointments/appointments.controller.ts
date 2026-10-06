import { Controller, Get, Post, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('appointments')
@ApiTags('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una cita' })
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
  cancel(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.appointmentsService.cancel(id, request.user);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar el estado de una cita para ADMIN' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateAppointmentStatusDto) {
    return this.appointmentsService.updateStatus(id, body.status);
  }
}