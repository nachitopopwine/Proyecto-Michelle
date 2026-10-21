import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { ApiExcludeController } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';

/** Despertar el servidor free e iniciar recordatorios, sin hacer públicos los pacientes. */
@ApiExcludeController()
@Controller('internal')
export class RemindersController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('reminders')
  async execute(@Headers('x-cron-secret') provided?: string) {
    const expected = process.env.CRON_SECRET;
    if (!expected || expected.length < 32 || !provided) {
      throw new UnauthorizedException();
    }
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
    await this.appointmentsService.sendReminders();
    return { ok: true };
  }
}
