import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true, message: 'Las horas deben tener formato HH:mm' })
  slotTimes?: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'Los feriados deben tener formato YYYY-MM-DD' })
  holidays?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  bookingWindowDays?: number;
}
