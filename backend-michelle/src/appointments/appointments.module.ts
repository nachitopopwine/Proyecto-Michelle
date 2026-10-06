import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './entities/appointment.entity';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, RolesGuard],
})
export class AppointmentsModule {}
