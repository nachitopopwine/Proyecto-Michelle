import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario' })
  register(@Body() body: CreateAuthDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() body: LoginAuthDto) {
    return this.authService.login(body);
  }
}
