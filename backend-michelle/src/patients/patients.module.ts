import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Auth, AuthSchema } from '../auth/entities/auth.entity';
import { Appointment, AppointmentSchema } from '../appointments/entities/appointment.entity';
import { ConsultationsModule } from '../consultations/consultations.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auth.name, schema: AuthSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ConsultationsModule,
    FilesModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
