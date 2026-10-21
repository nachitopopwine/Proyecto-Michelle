import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import type { ConsultationDocument } from './entities/consultation.entity';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AppointmentsService } from '../appointments/appointments.service';
import { FilesService, toBuffer } from '../files/files.service';
import { MailService, escapeHtml } from '../mail/mail.service';
import { buildPautaPdf } from './pdf/pauta-pdf';
import { formatChile } from '../common/timezone';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel('Consultation')
    private consultationModel: Model<ConsultationDocument>,
    private appointmentsService: AppointmentsService,
    private filesService: FilesService,
    private mailService: MailService,
  ) {}

  /**
   * Guarda la ficha de la consulta (una por cita). Con finalize=true la cierra,
   * marca la cita como COMPLETED y envía la pauta PDF al paciente.
   * Se puede reintentar sin duplicar mientras la consulta no esté cerrada.
   */
  async create(dto: CreateConsultationDto) {
    const { finalize, ...data } = dto;
    const appointment = await this.appointmentsService.findById(data.appointmentId);
    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('No se puede registrar una consulta de una cita cancelada');
    }

    const existing = await this.consultationModel.findOne({ appointmentId: data.appointmentId }).exec();
    if (existing?.closed || appointment.status === 'COMPLETED') {
      throw new ConflictException('Esta consulta ya fue finalizada y no se puede modificar');
    }

    await this.filesService.assertShareable(data.attachmentIds ?? existing?.attachmentIds ?? [], appointment.patientId);

    const consultation = await this.consultationModel
      .findOneAndUpdate(
        { appointmentId: data.appointmentId },
        {
          ...data,
          attachmentIds: data.attachmentIds ?? existing?.attachmentIds ?? [],
          patientId: appointment.patientId,
          appointmentDate: appointment.date,
          ...(finalize ? { closed: true, closedAt: new Date() } : {}),
        },
        { new: true, upsert: true },
      )
      .exec();

    if (!finalize) return { consultation, emailSent: false, mailEnabled: this.mailService.enabled };

    await this.appointmentsService.complete(data.appointmentId);
    const emailSent = await this.sendPauta(consultation);
    return { consultation, emailSent, mailEnabled: this.mailService.enabled };
  }

  findAll() {
    return this.consultationModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Consulta no encontrada');
    const consultation = await this.consultationModel.findById(id).exec();
    if (!consultation) throw new NotFoundException('Consulta no encontrada');
    return consultation;
  }

  findByAppointment(appointmentId: string) {
    return this.consultationModel.findOne({ appointmentId }).exec();
  }

  /** Historial clínico de un paciente (ADMIN). */
  findByPatient(patientId: string) {
    return this.consultationModel.find({ patientId }).sort({ appointmentDate: -1 }).lean().exec();
  }

  /** Pautas entregadas al paciente autenticado (sin la anamnesis interna). */
  async findMine(user: AuthenticatedUser) {
    const consultations = await this.consultationModel
      .find({ patientId: user.sub, closed: true })
      .select('-notes')
      .sort({ appointmentDate: -1 })
      .lean()
      .exec();
    const files = await this.filesService.findByIds(consultations.flatMap((item) => item.attachmentIds ?? []));
    return consultations.map((item) => ({
      ...item,
      attachments: files
        .filter((file) => item.attachmentIds?.includes(file._id.toString()) && (!file.patientId || file.patientId === user.sub))
        .map((file) => ({ _id: file._id, name: file.name, mimeType: file.mimeType })),
    }));
  }

  async update(id: string, dto: UpdateConsultationDto) {
    const consultation = await this.findOne(id);
    if (consultation.closed) {
      throw new ConflictException('Esta consulta ya fue finalizada y no se puede modificar');
    }
    const { finalize: _finalize, appointmentId: _appointmentId, ...data } = dto;
    if (data.attachmentIds) {
      await this.filesService.assertShareable(data.attachmentIds, consultation.patientId!);
    }
    return this.consultationModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async remove(id: string) {
    const consultation = await this.findOne(id);
    if (consultation.closed) {
      throw new ConflictException('Las consultas finalizadas forman parte de la ficha clínica y no se eliminan');
    }
    return this.consultationModel.findByIdAndDelete(id).exec();
  }

  async pdf(id: string, user: AuthenticatedUser) {
    const consultation = await this.findOne(id);
    if (user.role !== 'ADMIN' && (consultation.patientId !== user.sub || !consultation.closed)) {
      throw new ForbiddenException('No tienes acceso a esta pauta');
    }
    return this.renderPdf(consultation);
  }

  async resend(id: string) {
    const consultation = await this.findOne(id);
    if (!consultation.closed) throw new BadRequestException('Primero debes finalizar la consulta');
    const emailSent = await this.sendPauta(consultation);
    return { emailSent, mailEnabled: this.mailService.enabled };
  }

  private async renderPdf(consultation: ConsultationDocument) {
    const appointment = await this.appointmentsService.findById(consultation.appointmentId);
    const files = await this.filesService.findByIds(consultation.attachmentIds ?? []);
    const buffer = await buildPautaPdf({
      patientName: appointment.patientName,
      date: appointment.date,
      type: appointment.type,
      weight: consultation.weight,
      bodyFat: consultation.bodyFat,
      muscleMass: consultation.muscleMass,
      actionPlan: consultation.actionPlan,
      attachmentNames: files.map((file) => file.name),
    });
    return { buffer, filename: `pauta-${appointment.date.toISOString().slice(0, 10)}.pdf` };
  }

  private async sendPauta(consultation: ConsultationDocument) {
    const appointment = await this.appointmentsService.findById(consultation.appointmentId);
    const { buffer, filename } = await this.renderPdf(consultation);
    const files = await this.filesService.findWithData(consultation.attachmentIds ?? []);

    const sent = await this.mailService.send({
      to: appointment.patientEmail,
      subject: 'Tu pauta nutricional',
      html: `<p>Hola ${escapeHtml(appointment.patientName)},</p>
<p>Gracias por asistir a tu consulta del ${formatChile(appointment.date)}. Adjuntamos tu pauta nutricional${files.length ? ' y el material de apoyo' : ''}.</p>
<p>También puedes descargarla cuando quieras desde "Mi cuenta" en el sitio.</p>`,
      attachments: [
        { filename, content: buffer },
        ...files.map((file) => ({ filename: file.name, content: toBuffer(file.data) })),
      ],
    });

    if (sent) {
      await this.consultationModel.updateOne({ _id: consultation._id }, { emailSentAt: new Date() }).exec();
    }
    return sent;
  }
}
