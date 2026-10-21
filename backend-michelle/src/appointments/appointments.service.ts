import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import type { AppointmentDocument } from './entities/appointment.entity';
import type { UserDocument } from '../auth/entities/auth.entity';
import { TurnstileService } from '../security/turnstile.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { ScheduleService } from '../schedule/schedule.service';
import { MailService, escapeHtml } from '../mail/mail.service';
import { CalendarService } from '../calendar/calendar.service';
import { formatChile } from '../common/timezone';

const REMINDER_INTERVAL_MS = 30 * 60 * 1000;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function isDuplicateKey(error: unknown) {
  return (error as { code?: number })?.code === 11000;
}

@Injectable()
export class AppointmentsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentsService.name);
  private reminderTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel('Appointment')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('Auth')
    private userModel: Model<UserDocument>,
    private turnstileService: TurnstileService,
    private scheduleService: ScheduleService,
    private mailService: MailService,
    private calendarService: CalendarService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    this.reminderTimer = setInterval(() => void this.sendReminders(), REMINDER_INTERVAL_MS);
    this.reminderTimer.unref();
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  async create(data: CreateAppointmentDto, user: AuthenticatedUser, remoteIp?: string) {
    const bookedByAdmin = user.role === 'ADMIN';
    if (!bookedByAdmin) await this.turnstileService.verify(data.turnstileToken, remoteIp);
    if (bookedByAdmin && !data.patientId) {
      throw new BadRequestException('Selecciona el paciente para agendar la hora');
    }

    const patientId = bookedByAdmin ? data.patientId! : user.sub;
    const patient = await this.userModel.findById(patientId).lean().exec();
    if (!patient || patient.role !== 'PATIENT') throw new NotFoundException('Paciente no encontrado');

    const appointmentDate = new Date(data.date);
    await this.scheduleService.assertBookable(appointmentDate);

    const occupied = await this.appointmentModel.findOne({
      date: appointmentDate,
      status: { $ne: 'CANCELLED' },
    });
    if (occupied) {
      throw new ConflictException('Ese horario ya está reservado');
    }

    let appointment: AppointmentDocument;
    try {
      appointment = await this.appointmentModel.create({
        date: appointmentDate,
        type: data.type,
        patientId,
        patientName: patient.name,
        patientEmail: patient.email,
        patientNotes: data.patientNotes?.trim() || undefined,
        // Las horas que agenda Michelle quedan confirmadas de inmediato
        status: bookedByAdmin ? 'CONFIRMED' : 'PENDING',
      });
    } catch (error) {
      if (isDuplicateKey(error)) throw new ConflictException('Ese horario ya está reservado');
      throw error;
    }

    await this.syncCalendar(appointment);
    await this.notifyPatient(
      appointment,
      bookedByAdmin ? 'Tu hora fue agendada' : 'Recibimos tu solicitud de hora',
      bookedByAdmin
        ? 'Michelle agendó una hora para ti.'
        : 'Tu solicitud quedó registrada y está pendiente de confirmación. Te avisaremos cuando Michelle la confirme.',
    );
    if (!bookedByAdmin) {
      await this.notifyAdmin(
        `Nueva solicitud de hora: ${appointment.patientName}`,
        `${escapeHtml(appointment.patientName)} solicitó una hora ${escapeHtml(appointment.type)} para el ${formatChile(appointment.date)}.`,
      );
    }
    return appointment;
  }

  findAll(user: AuthenticatedUser) {
    const filter = user.role === 'ADMIN' ? {} : { patientId: user.sub };
    return this.appointmentModel.find(filter).sort({ date: 1 }).exec();
  }

  async cancel(id: string, user: AuthenticatedUser, reason?: string) {
    const appointment = await this.findOpen(id);
    if (user.role !== 'ADMIN' && appointment.patientId !== user.sub) {
      throw new NotFoundException('Cita no encontrada o ya no se puede cancelar');
    }

    appointment.status = 'CANCELLED';
    appointment.cancelReason = reason?.trim() || undefined;
    await appointment.save();
    await this.calendarService.remove(appointment.eventId);

    if (user.role === 'ADMIN') {
      await this.notifyPatient(
        appointment,
        'Tu hora fue cancelada',
        'Lamentablemente tu hora fue cancelada. Puedes agendar una nueva cuando quieras.',
        appointment.cancelReason,
      );
    } else {
      await this.notifyAdmin(
        `Hora cancelada por ${appointment.patientName}`,
        `${escapeHtml(appointment.patientName)} canceló su hora del ${formatChile(appointment.date)}. El bloque quedó libre.`,
      );
    }
    return appointment;
  }

  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED', reason?: string) {
    const appointment = await this.findOpen(id);
    if (status === 'CANCELLED') {
      return this.cancel(id, { sub: 'admin', email: '', role: 'ADMIN' }, reason);
    }

    const changed = appointment.status !== status;
    appointment.status = status;
    await appointment.save();
    await this.syncCalendar(appointment);

    if (changed && status === 'CONFIRMED') {
      await this.notifyPatient(appointment, 'Tu hora está confirmada', 'Michelle confirmó tu hora. ¡Te esperamos!');
    }
    return appointment;
  }

  /** Marca la cita como realizada (lo usa el cierre de la consulta). */
  async complete(id: string) {
    const appointment = await this.appointmentModel
      .findOneAndUpdate(
        { _id: id, status: { $in: ['PENDING', 'CONFIRMED'] } },
        { status: 'COMPLETED' },
        { new: true },
      )
      .exec();
    if (appointment) await this.syncCalendar(appointment);
    return appointment;
  }

  async findById(id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Cita no encontrada');
    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    return appointment;
  }

  async sendReminders() {
    if (!this.mailService.enabled) return;
    const now = new Date();
    const upcoming = await this.appointmentModel
      .find({
        status: { $in: ['PENDING', 'CONFIRMED'] },
        date: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
        reminderSentAt: { $exists: false },
      })
      .exec();

    for (const appointment of upcoming) {
      const sent = await this.notifyPatient(
        appointment,
        'Recordatorio de tu hora',
        'Te recordamos que tienes una hora con Michelle en las próximas 24 horas.',
      );
      if (sent) {
        appointment.reminderSentAt = new Date();
        await appointment.save();
      }
    }
    if (upcoming.length) this.logger.log(`Recordatorios procesados: ${upcoming.length}`);
  }

  private async findOpen(id: string) {
    const appointment = await this.findById(id);
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      throw new ForbiddenException('La cita ya está cerrada y no se puede modificar');
    }
    return appointment;
  }

  private async syncCalendar(appointment: AppointmentDocument) {
    if (!this.calendarService.enabled) return;
    const settings = await this.scheduleService.getSettings();
    const eventId = await this.calendarService.upsert(appointment, settings.durationMinutes);
    if (eventId && eventId !== appointment.eventId) {
      appointment.eventId = eventId;
      await appointment.save();
    }
  }

  private notifyPatient(appointment: AppointmentDocument, subject: string, intro: string, reason?: string) {
    return this.mailService.send({
      to: appointment.patientEmail,
      subject,
      html: `<p>Hola ${escapeHtml(appointment.patientName)},</p>
<p>${intro}</p>
<ul>
  <li><strong>Fecha:</strong> ${formatChile(appointment.date)}</li>
  <li><strong>Modalidad:</strong> ${escapeHtml(appointment.type)}</li>
</ul>
${reason ? `<p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>` : ''}`,
    });
  }

  private async notifyAdmin(subject: string, html: string) {
    const admin = process.env.ADMIN_EMAIL;
    if (admin) await this.mailService.send({ to: admin, subject, html: `<p>${html}</p>` });
  }
}
