import {
	IsArray,
	IsBoolean,
	IsMongoId,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

export class CreateConsultationDto {
	@IsMongoId()
	appointmentId: string;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(400)
	weight?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	bodyFat?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(200)
	muscleMass?: number;

	@IsOptional()
	@IsString()
	@MaxLength(10000)
	notes?: string;

	@IsOptional()
	@IsString()
	@MaxLength(10000)
	actionPlan?: string;

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	attachmentIds?: string[];

	/** true = finalizar: cierra la consulta, completa la cita y envía la pauta */
	@IsOptional()
	@IsBoolean()
	finalize?: boolean;
}
