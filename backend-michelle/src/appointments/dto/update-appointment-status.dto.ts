import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentStatusDto {
  // COMPLETED solo se asigna al finalizar la consulta (POST /consultations)
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
