import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    // El body espera: { email, password, name, role? }
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: any) {
    // El body espera: { email, password }
    return this.authService.login(body);
  }
}