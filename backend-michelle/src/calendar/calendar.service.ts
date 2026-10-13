import { Injectable, Logger } from '@nestjs/common';
import type { calendar_v3 } from 'googleapis';
import { TIME_ZONE } from '../common/timezone';

export interface CalendarAppointment {
  date: Date;
  type: string;
  status: string;
  patientName: string;
  patientEmail: string;
  patientNotes?: string;
  eventId?: string;
}

// Sincroniza las citas con el Google Calendar de Michelle mediante una cuenta de servicio.
// Variables: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_CALENDAR_ID
// (el calendario debe estar compartido con la cuenta de servicio con permiso de edición).
// Sin estas variables la sincronización queda desactivada y la agenda funciona igual.
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private client?: Promise<calendar_v3.Calendar>;

  get enabled() {
    return Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_CALENDAR_ID,
    );
  }

  private getClient() {
    this.client ??= import('googleapis').then(({ google }) => {
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      return google.calendar({ version: 'v3', auth });
    });
    return this.client;
  }

  private toEvent(appointment: CalendarAppointment, durationMinutes: number): calendar_v3.Schema$Event {
    const end = new Date(appointment.date.getTime() + durationMinutes * 60_000);
    const prefix = appointment.status === 'PENDING' ? '[Por confirmar] ' : '';
    return {
      summary: `${prefix}Consulta ${appointment.type}: ${appointment.patientName}`,
      description: [
        `Paciente: ${appointment.patientName} (${appointment.patientEmail})`,
        appointment.patientNotes ? `Notas: ${appointment.patientNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      start: { dateTime: appointment.date.toISOString(), timeZone: TIME_ZONE },
      end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
    };
  }

  /** Crea o actualiza el evento. Devuelve el id del evento o undefined si falla. */
  async upsert(appointment: CalendarAppointment, durationMinutes: number): Promise<string | undefined> {
    if (!this.enabled) return appointment.eventId;
    try {
      const calendar = await this.getClient();
      const requestBody = this.toEvent(appointment, durationMinutes);
      const calendarId = process.env.GOOGLE_CALENDAR_ID!;
      const result = appointment.eventId
        ? await calendar.events.update({ calendarId, eventId: appointment.eventId, requestBody })
        : await calendar.events.insert({ calendarId, requestBody });
      return result.data.id ?? undefined;
    } catch (error) {
      this.logger.error(`No se pudo sincronizar con Google Calendar: ${(error as Error).message}`);
      return appointment.eventId;
    }
  }

  async remove(eventId?: string) {
    if (!this.enabled || !eventId) return;
    try {
      const calendar = await this.getClient();
      await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID!, eventId });
    } catch (error) {
      this.logger.error(`No se pudo eliminar el evento de Google Calendar: ${(error as Error).message}`);
    }
  }
}
