import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super_secreto_desarrollo', // En producción, usar variable de entorno
      signOptions: { expiresIn: '1d' }, // El token durará 1 día
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}