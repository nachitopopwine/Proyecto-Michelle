import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConsultationsModule } from './consultations/consultations.module';

@Module({
  imports: [PrismaModule, AuthModule, AppointmentsModule, CalendarModule, ConsultationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
