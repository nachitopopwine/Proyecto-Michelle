import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AppointmentDocument } from '../appointments/entities/appointment.entity';
import {
  DEFAULT_SCHEDULE,
  ScheduleSettingsDocument,
} from './entities/schedule-settings.entity';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { addDays, weekdayOf, zonedTime, zonedToUtc, zonedYmd } from '../common/timezone';

export interface AvailabilityDay {
  date: string;
  weekday: number;
  slots: Array<{ time: string; iso: string; available: boolean }>;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel('ScheduleSettings')
    private settingsModel: Model<ScheduleSettingsDocument>,
    @InjectModel('Appointment')
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async getSettings() {
    const settings = await this.settingsModel.findOne().lean().exec();
    if (settings) return settings;
    return (await this.settingsModel.create(DEFAULT_SCHEDULE)).toObject();
  }

  async updateSettings(data: UpdateScheduleDto) {
    await this.getSettings();
    const update = { ...data };
    if (update.slotTimes) update.slotTimes = [...update.slotTimes].sort();
    if (update.workingDays) update.workingDays = [...update.workingDays].sort();
    if (update.holidays) update.holidays = [...update.holidays].sort();
    return this.settingsModel.findOneAndUpdate({}, update, { new: true }).lean().exec();
  }

  /** Bloques de los próximos días con su disponibilidad (sin datos de pacientes). */
  async getAvailability(): Promise<AvailabilityDay[]> {
    const settings = await this.getSettings();
    const now = new Date();
    const today = zonedYmd(now);
    const lastDay = addDays(today, settings.bookingWindowDays);

    const taken = await this.appointmentModel
      .find({
        date: { $gte: now, $lte: zonedToUtc(addDays(lastDay, 1), '00:00') },
        status: { $ne: 'CANCELLED' },
      })
      .select('date')
      .lean()
      .exec();
    const takenTimes = new Set(taken.map((appointment) => new Date(appointment.date).getTime()));

    const days: AvailabilityDay[] = [];
    for (let offset = 0; offset <= settings.bookingWindowDays; offset++) {
      const date = addDays(today, offset);
      const weekday = weekdayOf(date);
      if (!settings.workingDays.includes(weekday) || settings.holidays.includes(date)) continue;

      const slots = settings.slotTimes.map((time) => {
        const instant = zonedToUtc(date, time);
        return {
          time,
          iso: instant.toISOString(),
          available: instant.getTime() > now.getTime() && !takenTimes.has(instant.getTime()),
        };
      });
      if (slots.some((slot) => new Date(slot.iso).getTime() > now.getTime())) {
        days.push({ date, weekday, slots });
      }
    }
    return days;
  }

  /** Verifica que el instante corresponda a un bloque de atención válido. */
  async assertBookable(date: Date) {
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Fecha inválida');
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('No se puede agendar una hora en el pasado');
    }

    const settings = await this.getSettings();
    const ymd = zonedYmd(date);
    const time = zonedTime(date);
    const lastDay = addDays(zonedYmd(new Date()), settings.bookingWindowDays);

    if (
      !settings.workingDays.includes(weekdayOf(ymd)) ||
      settings.holidays.includes(ymd) ||
      !settings.slotTimes.includes(time) ||
      zonedToUtc(ymd, time).getTime() !== date.getTime()
    ) {
      throw new BadRequestException('Ese horario no está dentro de la agenda de atención');
    }
    if (ymd > lastDay) {
      throw new BadRequestException(`Solo se puede agendar con ${settings.bookingWindowDays} días de anticipación`);
    }
  }
}
