import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { SecurityModule } from './security/security.module';
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from './schedule/schedule.module';
import { FilesModule } from './files/files.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/michelle',
    ),
    SecurityModule,
    MailModule,
    AuthModule,
    ScheduleModule,
    CalendarModule,
    AppointmentsModule,
    FilesModule,
    ConsultationsModule,
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
