import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserDocument } from './entities/auth.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('Auth') private userModel: Model<UserDocument>,
    private jwtService: JwtService
  ) {}

  async register(data: any) {
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
      role: data.role || 'PATIENT',
    });

    return { 
      message: 'Usuario creado exitosamente', 
      user: { id: user._id.toString(), email: user.email, role: user.role }
    };
  }

  async login(data: any) {
    // 1. Buscar al usuario
    const user = await this.userModel.findOne({ email: data.email }).select('+password');
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // 2. Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    // 3. Generar JWT
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { name: user.name, role: user.role }
    };
  }
}