import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import type { ConsultationDocument } from './entities/consultation.entity';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel('Consultation')
    private consultationModel: Model<ConsultationDocument>,
  ) {}

  create(createConsultationDto: CreateConsultationDto) {
    return this.consultationModel.create(createConsultationDto);
  }

  findAll() {
    return this.consultationModel.find().sort({ createdAt: -1 }).exec();
  }

  findOne(id: string) {
    return this.consultationModel.findById(id).exec();
  }

  update(id: string, updateConsultationDto: UpdateConsultationDto) {
    return this.consultationModel.findByIdAndUpdate(id, updateConsultationDto, { new: true }).exec();
  }

  remove(id: string) {
    return this.consultationModel.findByIdAndDelete(id).exec();
  }
}
