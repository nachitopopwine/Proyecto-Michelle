import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(80)
  name: string;

  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;
}
