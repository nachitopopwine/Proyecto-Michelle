import { Controller, Post, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() body: any) {
    // El body enviado desde React debe verse así:
    // {
    //   "date": "2026-08-15T15:00:00.000Z",
    //   "type": "Online",
    //   "patientId": "ID-DEL-USUARIO-OBTENIDO-AL-LOGIN"
    // }
    return this.appointmentsService.create(body);
  }
}