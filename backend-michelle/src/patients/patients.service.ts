import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { UserDocument } from '../auth/entities/auth.entity';
import type { AppointmentDocument } from '../appointments/entities/appointment.entity';
import { ConsultationsService } from '../consultations/consultations.service';
import { FilesService } from '../files/files.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { normalizeEmail } from '../auth/auth.service';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel('Auth') private userModel: Model<UserDocument>,
    @InjectModel('Appointment') private appointmentModel: Model<AppointmentDocument>,
    private consultationsService: ConsultationsService,
    private filesService: FilesService,
  ) {}

  /** Todos los pacientes registrados con un resumen de su agenda. */
  async findAll() {
    const [patients, stats] = await Promise.all([
      this.userModel.find({ role: 'PATIENT' }).sort({ name: 1 }).lean().exec(),
      this.appointmentModel
        .aggregate<{ _id: string; total: number; completed: number; lastVisit?: Date; nextVisit?: Date }>([
          {
            $group: {
              _id: '$patientId',
              total: { $sum: { $cond: [{ $ne: ['$status', 'CANCELLED'] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
              lastVisit: { $max: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$date', null] } },
              nextVisit: {
                $min: {
                  $cond: [
                    { $and: [{ $in: ['$status', ['PENDING', 'CONFIRMED']] }, { $gt: ['$date', new Date()] }] },
                    '$date',
                    null,
                  ],
                },
              },
            },
          },
        ])
        .exec(),
    ]);

    const byPatient = new Map(stats.map((item) => [item._id, item]));
    return patients.map((patient) => {
      const summary = byPatient.get(patient._id.toString());
      return {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        createdAt: patient.createdAt,
        totalAppointments: summary?.total ?? 0,
        completedAppointments: summary?.completed ?? 0,
        lastVisit: summary?.lastVisit ?? null,
        nextVisit: summary?.nextVisit ?? null,
      };
    });
  }

  /** Ficha del paciente: datos, horas y consultas con mediciones. */
  async findOne(id: string) {
    const patient = await this.getPatient(id, true);
    const [appointments, consultations, files] = await Promise.all([
      this.appointmentModel.find({ patientId: id }).sort({ date: -1 }).lean().exec(),
      this.consultationsService.findByPatient(id),
      this.filesService.list(id),
    ]);
    return {
      patient: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        adminNotes: patient.adminNotes ?? '',
        consentAt: patient.consentAt,
        createdAt: patient.createdAt,
      },
      appointments,
      consultations,
      files: files.filter((file) => file.patientId === id),
    };
  }

  /**
   * Michelle crea al paciente sin que él se registre. Se genera una contraseña aleatoria;
   * el paciente puede activar su cuenta con "¿Olvidaste tu contraseña?".
   */
  async create(data: CreatePatientDto) {
    const email = normalizeEmail(data.email);
    if (await this.userModel.exists({ email })) {
      throw new BadRequestException('Ya existe una cuenta con ese correo');
    }
    const patient = await this.userModel.create({
      email,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      adminNotes: data.adminNotes,
      password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
      role: 'PATIENT',
    });
    return { _id: patient._id, name: patient.name, email: patient.email, phone: patient.phone };
  }

  async update(id: string, data: UpdatePatientDto) {
    await this.getPatient(id);
    await this.userModel.updateOne({ _id: id }, data).exec();
    return this.findOne(id);
  }

  private async getPatient(id: string, withNotes = false) {
    if (!isValidObjectId(id)) throw new NotFoundException('Paciente no encontrado');
    const query = this.userModel.findOne({ _id: id, role: 'PATIENT' });
    if (withNotes) query.select('+adminNotes');
    const patient = await query.lean().exec();
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }
}
