import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
	@IsDateString()
	date: string;

	@IsIn(['Online', 'Presencial', 'Domicilio'])
	type: string;

	@IsOptional()
	@IsString()
	patientId?: string;

	@IsOptional()
	@IsString()
	turnstileToken?: string;
}
