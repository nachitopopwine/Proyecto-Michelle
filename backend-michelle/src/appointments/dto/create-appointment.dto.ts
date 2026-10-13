import { IsDateString, IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { APPOINTMENT_TYPES } from '../entities/appointment.entity';

export class CreateAppointmentDto {
	@IsDateString()
	date: string;

	@IsIn(APPOINTMENT_TYPES, { message: 'La modalidad debe ser Online, Presencial o Domicilio' })
	type: string;

	/** Solo ADMIN: agendar a nombre de un paciente */
	@IsOptional()
	@IsMongoId()
	patientId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(300)
	patientNotes?: string;

	@IsOptional()
	@IsString()
	turnstileToken?: string;
}
