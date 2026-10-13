import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsultationDocument = HydratedDocument<Consultation>;

@Schema({ timestamps: true, collection: 'consultations' })
export class Consultation {
	@Prop({ required: true, unique: true, index: true })
	appointmentId: string;

	@Prop({ index: true })
	patientId?: string;

	@Prop()
	appointmentDate?: Date;

	@Prop()
	weight?: number;

	@Prop()
	bodyFat?: number;

	@Prop()
	muscleMass?: number;

	/** Anamnesis: solo visible para Michelle */
	@Prop()
	notes?: string;

	/** Indicaciones que van en la pauta PDF del paciente */
	@Prop()
	actionPlan?: string;

	/** Archivos (pautas) entregados al paciente en esta consulta */
	@Prop({ type: [String], default: [] })
	attachmentIds: string[];

	/** true cuando la consulta fue finalizada; ya no se puede editar */
	@Prop({ default: false })
	closed: boolean;

	@Prop()
	closedAt?: Date;

	@Prop()
	emailSentAt?: Date;

	createdAt?: Date;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);
