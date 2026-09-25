import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(8)
	password: string;

	@IsString()
	@MinLength(2)
	name: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsIn(['PATIENT', 'ADMIN'])
	role?: 'PATIENT' | 'ADMIN';
}