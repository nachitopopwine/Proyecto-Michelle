import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

export const APPOINTMENT_TYPES = ['Online', 'Presencial', 'Domicilio'] as const;
export const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
	@Prop({ required: true, type: Date })
	date: Date;

	@Prop({ required: true, enum: APPOINTMENT_TYPES })
	type: string;

	@Prop({ required: true, enum: APPOINTMENT_STATUSES, default: 'PENDING' })
	status: AppointmentStatus;

	@Prop({ required: true, index: true })
	patientId: string;

	@Prop({ required: true })
	patientName: string;

	@Prop({ required: true })
	patientEmail: string;

	/** Dirección (domicilio) u observación del paciente al agendar */
	@Prop({ trim: true })
	patientNotes?: string;

	/** Motivo de cancelación o rechazo */
	@Prop({ trim: true })
	cancelReason?: string;

	@Prop()
	eventId?: string;

	@Prop()
	reminderSentAt?: Date;

	createdAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Un solo paciente por bloque: evita dobles reservas aunque lleguen dos solicitudes a la vez.
AppointmentSchema.index(
  { date: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
  },
);
