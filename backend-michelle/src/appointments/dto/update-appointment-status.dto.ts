import { IsIn } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
  status: string;
}