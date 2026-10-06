import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('consultations')
@ApiTags('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una consulta clínica' })
  create(@Body() createConsultationDto: CreateConsultationDto) {
    return this.consultationsService.create(createConsultationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar consultas clínicas' })
  findAll() {
    return this.consultationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto) {
    return this.consultationsService.update(id, updateConsultationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consultationsService.remove(id);
  }
}
