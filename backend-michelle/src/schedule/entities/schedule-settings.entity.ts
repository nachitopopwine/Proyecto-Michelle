import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScheduleSettingsDocument = HydratedDocument<ScheduleSettings>;

export const DEFAULT_SCHEDULE = {
  workingDays: [1, 2, 3, 4, 5],
  slotTimes: ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'],
  durationMinutes: 60,
  holidays: [] as string[],
  bookingWindowDays: 21,
};

// Documento único con el horario de atención de Michelle
@Schema({ timestamps: true, collection: 'schedule_settings' })
export class ScheduleSettings {
  /** Días de atención, 0 = domingo ... 6 = sábado */
  @Prop({ type: [Number], default: DEFAULT_SCHEDULE.workingDays })
  workingDays: number[];

  /** Horas de inicio de cada bloque, formato HH:mm (hora de Chile) */
  @Prop({ type: [String], default: DEFAULT_SCHEDULE.slotTimes })
  slotTimes: string[];

  @Prop({ default: DEFAULT_SCHEDULE.durationMinutes })
  durationMinutes: number;

  /** Feriados o días bloqueados, formato YYYY-MM-DD */
  @Prop({ type: [String], default: [] })
  holidays: string[];

  /** Cuántos días hacia adelante se puede agendar */
  @Prop({ default: DEFAULT_SCHEDULE.bookingWindowDays })
  bookingWindowDays: number;
}

export const ScheduleSettingsSchema = SchemaFactory.createForClass(ScheduleSettings);
