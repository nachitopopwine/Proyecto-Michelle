import { Equals, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAuthDto {
	@IsEmail({}, { message: 'Correo electrónico inválido' })
	email: string;

	@IsString()
	@MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
	password: string;

	@IsString()
	@MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
	@MaxLength(80)
	name: string;

	@IsOptional()
	@IsString()
	@MaxLength(30)
	phone?: string;

	@Equals(true, { message: 'Debes aceptar el aviso de privacidad para crear tu cuenta' })
	acceptPrivacy: boolean;

	@IsOptional()
	@IsString()
	turnstileToken?: string;
}
