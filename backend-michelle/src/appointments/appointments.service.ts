import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AppointmentDocument } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel('Appointment')
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(data: any) {
    const appointmentDate = new Date(data.date);

    return this.appointmentModel.create({
      date: appointmentDate,
      type: data.type,
      patientId: data.patientId,
      status: 'PENDING',
    });
  }
}