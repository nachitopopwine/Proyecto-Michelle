import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Consultation, ConsultationSchema } from './entities/consultation.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Consultation.name, schema: ConsultationSchema }])],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
})
export class ConsultationsModule {}
