import { RemindersController } from './reminders.controller';
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './entities/appointment.entity';
import { Auth, AuthSchema } from '../auth/entities/auth.entity';
import { RolesGuard } from '../auth/roles.guard';
import { ScheduleModule } from '../schedule/schedule.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Auth.name, schema: AuthSchema },
    ]),
    ScheduleModule,
    CalendarModule,
  ],
  controllers: [AppointmentsController, RemindersController],
  providers: [AppointmentsService, RolesGuard],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
