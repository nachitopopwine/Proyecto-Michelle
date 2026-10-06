import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}