import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
	@Prop({ required: true, type: Date })
	date: Date;

	@Prop({ required: true, enum: ['Online', 'Presencial', 'Domicilio'] })
	type: string;

	@Prop({ required: true, enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], default: 'PENDING' })
	status: string;

	@Prop({ required: true, index: true })
	patientId: string;

	@Prop()
	eventId?: string;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
