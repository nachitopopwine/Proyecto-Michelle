import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PatientFileDocument = HydratedDocument<PatientFile>;

// Pautas y archivos (PDF/Word). Sin patientId es un archivo de la biblioteca general
// que Michelle puede adjuntar a cualquier consulta.
@Schema({ timestamps: true, collection: 'files' })
export class PatientFile {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: Buffer, required: true, select: false })
  data: Buffer;

  @Prop({ index: true })
  patientId?: string;

  createdAt?: Date;
}

export const PatientFileSchema = SchemaFactory.createForClass(PatientFile);
