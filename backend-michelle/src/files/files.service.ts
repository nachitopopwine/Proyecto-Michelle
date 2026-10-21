import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import type { PatientFileDocument } from './entities/patient-file.entity';
import type { ConsultationDocument } from '../consultations/entities/consultation.entity';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

export const MAX_FILE_SIZE = 8 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

/** Con lean() Mongo devuelve un BSON Binary en vez de Buffer. */
export function toBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from((data as { buffer: Uint8Array }).buffer);
}

export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectModel('PatientFile') private fileModel: Model<PatientFileDocument>,
    @InjectModel('Consultation') private consultationModel: Model<ConsultationDocument>,
  ) {}

  async upload(file: UploadedFileData | undefined, name?: string, patientId?: string) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa PDF, Word, JPG o PNG');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo supera el máximo de 8 MB');
    }

    const created = await this.fileModel.create({
      name: name?.trim() || Buffer.from(file.originalname, 'latin1').toString('utf8'),
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      patientId: patientId || undefined,
    });
    const { data: _data, ...rest } = created.toObject();
    return rest;
  }

  /** Biblioteca general + archivos del paciente indicado. */
  list(patientId?: string) {
    const filter = patientId
      ? { $or: [{ patientId }, { patientId: { $exists: false } }, { patientId: null }] }
      : {};
    return this.fileModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  findByIds(ids: string[]) {
    return this.fileModel
      .find({ _id: { $in: ids.filter((id) => isValidObjectId(id)) } })
      .lean()
      .exec();
  }

  /** Solo se pueden entregar archivos generales o asignados a este paciente. */
  async assertShareable(ids: string[], patientId: string) {
    if (!ids.length) return;
    const files = await this.findByIds(ids);
    if (
      files.length !== new Set(ids).size ||
      files.some((file) => file.patientId && file.patientId !== patientId)
    ) {
      throw new BadRequestException('Uno de los archivos no existe o pertenece a otro paciente');
    }
  }

  async findWithData(ids: string[]) {
    return this.fileModel
      .find({ _id: { $in: ids.filter((id) => isValidObjectId(id)) } })
      .select('+data')
      .lean()
      .exec();
  }

  async download(id: string, user: AuthenticatedUser) {
    if (!isValidObjectId(id)) throw new NotFoundException('Archivo no encontrado');
    const file = await this.fileModel.findById(id).select('+data').lean().exec();
    if (!file) throw new NotFoundException('Archivo no encontrado');

    if (user.role !== 'ADMIN' && file.patientId && file.patientId !== user.sub) {
      throw new ForbiddenException('No tienes acceso a este archivo');
    }
    if (user.role !== 'ADMIN' && file.patientId !== user.sub) {
      const sharedWithPatient = await this.consultationModel.exists({
        patientId: user.sub,
        attachmentIds: id,
        closed: true,
      });
      if (!sharedWithPatient) throw new ForbiddenException('No tienes acceso a este archivo');
    }
    return file;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Archivo no encontrado');
    if (await this.consultationModel.exists({ attachmentIds: id, closed: true })) {
      throw new ConflictException('El archivo ya fue entregado y forma parte del historial de una consulta');
    }
    const file = await this.fileModel.findByIdAndDelete(id).lean().exec();
    if (!file) throw new NotFoundException('Archivo no encontrado');
    return { deleted: true };
  }
}
