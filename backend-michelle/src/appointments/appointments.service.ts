import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AppointmentDocument } from './entities/appointment.entity';
import { TurnstileService } from '../security/turnstile.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel('Appointment')
    private appointmentModel: Model<AppointmentDocument>,
    private turnstileService: TurnstileService,
  ) {}

  async create(data: CreateAppointmentDto, user: AuthenticatedUser, remoteIp?: string) {
    await this.turnstileService.verify(data.turnstileToken, remoteIp);
    const appointmentDate = new Date(data.date);
    const occupied = await this.appointmentModel.findOne({
      date: appointmentDate,
      status: { $ne: 'CANCELLED' },
    });

    if (occupied) {
      throw new ConflictException('Ese horario ya está reservado');
    }

    return this.appointmentModel.create({
      date: appointmentDate,
      type: data.type,
      patientId: user.sub,
      patientName: user.name ?? user.email,
      patientEmail: user.email,
      status: 'PENDING',
    });
  }

  findAll(user: AuthenticatedUser) {
    const filter = user.role === 'ADMIN' ? {} : { patientId: user.sub };
    return this.appointmentModel.find(filter).sort({ date: 1 }).exec();
  }

  cancel(id: string, user: AuthenticatedUser) {
    const filter = user.role === 'ADMIN' ? { _id: id } : { _id: id, patientId: user.sub };
    return this.appointmentModel
      .findOneAndUpdate(filter, { status: 'CANCELLED' }, { new: true })
      .exec();
  }

  async updateStatus(id: string, status: string) {
    const appointment = await this.appointmentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    return appointment;
  }
}