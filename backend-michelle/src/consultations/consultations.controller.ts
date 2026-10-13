import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Controller('consultations')
@ApiTags('consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Guardar borrador o finalizar la consulta (finalize=true envía la pauta)' })
  create(@Body() createConsultationDto: CreateConsultationDto) {
    return this.consultationsService.create(createConsultationDto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar consultas clínicas (filtro opcional por cita)' })
  findAll(@Query('appointmentId') appointmentId?: string) {
    if (appointmentId) return this.consultationsService.findByAppointment(appointmentId);
    return this.consultationsService.findAll();
  }

  @Get('mine')
  @ApiOperation({ summary: 'Pautas entregadas al paciente autenticado' })
  findMine(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.consultationsService.findMine(request.user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar la pauta en PDF' })
  async pdf(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
    @Res() response: Response,
  ) {
    const { buffer, filename } = await this.consultationsService.pdf(id, request.user);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.send(buffer);
  }

  @Post(':id/send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reenviar la pauta por correo' })
  resend(@Param('id') id: string) {
    return this.consultationsService.resend(id);
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto) {
    return this.consultationsService.update(id, updateConsultationDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.consultationsService.remove(id);
  }
}
