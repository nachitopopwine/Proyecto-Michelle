import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('patients')
@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes con resumen de agenda' })
  findAll() {
    return this.patientsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un paciente desde el panel' })
  create(@Body() body: CreatePatientDto) {
    return this.patientsService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha del paciente: datos, horas, consultas y archivos' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos y notas internas del paciente' })
  update(@Param('id') id: string, @Body() body: UpdatePatientDto) {
    return this.patientsService.update(id, body);
  }
}
