import { IsDateString, IsIn, IsString } from 'class-validator';

export class CreateAppointmentDto {
	@IsDateString()
	date: string;

	@IsIn(['Online', 'Presencial', 'Domicilio'])
	type: string;

	@IsString()
	patientId: string;
}
