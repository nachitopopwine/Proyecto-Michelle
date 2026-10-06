import { Injectable, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserDocument } from './entities/auth.entity';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { TurnstileService } from '../security/turnstile.service';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel('Auth') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private turnstileService: TurnstileService,
  ) {}

  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    const existingAdmin = await this.userModel.findOne({ email });
    if (existingAdmin) return;

    await this.userModel.create({
      email,
      password: await bcrypt.hash(password, 12),
      name: process.env.ADMIN_NAME ?? 'Nutricionista',
      role: 'ADMIN',
    });
  }

  async register(data: CreateAuthDto) {
    await this.turnstileService.verify(data.turnstileToken);
    // 1. Verificar si el correo ya existe
    const userExists = await this.userModel.findOne({ email: data.email });
    if (userExists) throw new BadRequestException('El correo ya está registrado');

    // 2. Hashear la contraseña (10 rondas de salt)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Crear el usuario en PostgreSQL
    const user = await this.userModel.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: 'PATIENT',
    });

    return { 
      message: 'Usuario creado exitosamente', 
      user: { id: user._id.toString(), email: user.email, role: user.role }
    };
  }

  async login(data: LoginAuthDto) {
    await this.turnstileService.verify(data.turnstileToken);
    // 1. Buscar al usuario
    const user = await this.userModel.findOne({ email: data.email }).select('+password');
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // 2. Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    // 3. Generar JWT
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { name: user.name, role: user.role }
    };
  }
}