import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserDocument } from './entities/auth.entity';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { TurnstileService } from '../security/turnstile.service';
import { MailService, escapeHtml } from '../mail/mail.service';
import { frontendUrl } from '../common/config';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('Auth') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private turnstileService: TurnstileService,
    private mailService: MailService,
  ) {}

  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    const existingAdmin = await this.userModel.findOne({ email: normalizeEmail(email) });
    if (existingAdmin) return;

    await this.userModel.create({
      email: normalizeEmail(email),
      password: await bcrypt.hash(password, 12),
      name: process.env.ADMIN_NAME ?? 'Nutricionista',
      role: 'ADMIN',
      consentAt: new Date(),
    });
  }

  async register(data: CreateAuthDto) {
    await this.turnstileService.verify(data.turnstileToken);
    const email = normalizeEmail(data.email);

    const userExists = await this.userModel.findOne({ email });
    if (userExists) throw new BadRequestException('El correo ya está registrado');

    const user = await this.userModel.create({
      email,
      password: await bcrypt.hash(data.password, 10),
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      role: 'PATIENT',
      consentAt: new Date(),
    });

    return {
      message: 'Usuario creado exitosamente',
      user: { id: user._id.toString(), email: user.email, role: user.role },
    };
  }

  async login(data: LoginAuthDto) {
    await this.turnstileService.verify(data.turnstileToken);
    const user = await this.userModel
      .findOne({ email: normalizeEmail(data.email) })
      .select('+password');
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone ?? '',
      role: user.role,
      consentAt: user.consentAt,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();

    if (data.newPassword) {
      if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.password))) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }
      user.password = await bcrypt.hash(data.newPassword, 10);
    }

    await user.save();
    return this.me(userId);
  }

  /** Siempre responde lo mismo para no revelar qué correos están registrados. */
  async forgotPassword(data: ForgotPasswordDto) {
    await this.turnstileService.verify(data.turnstileToken);
    const response = {
      message: 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.',
    };

    const user = await this.userModel.findOne({ email: normalizeEmail(data.email) });
    if (!user) return response;

    const token = randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const link = `${frontendUrl()}/?reset=${token}`;
    const sent = await this.mailService.send({
      to: user.email,
      subject: 'Recupera tu contraseña',
      html: `<p>Hola ${escapeHtml(user.name)},</p>
<p>Recibimos una solicitud para cambiar tu contraseña. El enlace es válido por 1 hora:</p>
<p><a href="${link}" style="background:#7e22ce;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Crear nueva contraseña</a></p>
<p>Si no fuiste tú, ignora este correo.</p>`,
    });
    if (!sent && process.env.NODE_ENV !== 'production') {
      this.logger.warn(`Enlace de recuperación (solo desarrollo): ${link}`);
    }
    return response;
  }

  async resetPassword(data: ResetPasswordDto) {
    const user = await this.userModel
      .findOne({
        resetTokenHash: hashToken(data.token),
        resetTokenExpires: { $gt: new Date() },
      })
      .select('+resetTokenHash +resetTokenExpires');
    if (!user) throw new BadRequestException('El enlace no es válido o ya expiró');

    user.password = await bcrypt.hash(data.password, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }
}
