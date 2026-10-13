import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Consultation, ConsultationSchema } from './entities/consultation.entity';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentsModule } from '../appointments/appointments.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Consultation.name, schema: ConsultationSchema }]),
    AppointmentsModule,
    FilesModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, RolesGuard],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
