import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Consultation, ConsultationSchema } from './entities/consultation.entity';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Consultation.name, schema: ConsultationSchema }])],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, RolesGuard],
})
export class ConsultationsModule {}
