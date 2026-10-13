import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PatientFile, PatientFileSchema } from './entities/patient-file.entity';
import { Consultation, ConsultationSchema } from '../consultations/entities/consultation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientFile.name, schema: PatientFileSchema },
      { name: Consultation.name, schema: ConsultationSchema },
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
