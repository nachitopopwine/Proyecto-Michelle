import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsultationDocument = HydratedDocument<Consultation>;

@Schema({ timestamps: true, collection: 'consultations' })
export class Consultation {
	@Prop({ required: true, unique: true, index: true })
	appointmentId: string;

	@Prop()
	weight?: number;

	@Prop()
	bodyFat?: number;

	@Prop()
	muscleMass?: number;

	@Prop()
	notes?: string;

	@Prop()
	actionPlan?: string;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);
