import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    // En Prisma, el modelo Appointment espera un DateTime.
    // Asumimos que desde React envías un string ISO, por ejemplo: "2026-08-15T15:00:00.000Z"
    const appointmentDate = new Date(data.date);

    const newAppointment = await this.prisma.appointment.create({
      data: {
        date: appointmentDate,
        type: data.type, // 'Online', 'Presencial', 'Domicilio'
        patientId: data.patientId, // El ID del usuario que está agendando
        status: 'PENDING',
      },
    });

    return newAppointment;
  }
}