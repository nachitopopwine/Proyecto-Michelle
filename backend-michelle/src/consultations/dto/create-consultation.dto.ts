import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateConsultationDto {
	@IsString()
	appointmentId: string;

	@IsOptional()
	@IsNumber()
	weight?: number;

	@IsOptional()
	@IsNumber()
	bodyFat?: number;

	@IsOptional()
	@IsNumber()
	muscleMass?: number;

	@IsOptional()
	@IsString()
	notes?: string;

	@IsOptional()
	@IsString()
	actionPlan?: string;
}
