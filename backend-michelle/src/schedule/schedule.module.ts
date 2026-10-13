import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleSettings, ScheduleSettingsSchema } from './entities/schedule-settings.entity';
import { Appointment, AppointmentSchema } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduleSettings.name, schema: ScheduleSettingsSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
