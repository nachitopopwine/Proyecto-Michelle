import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name?: string;
  role: 'PATIENT' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secreto_desarrollo',
    });
  }

  validate(payload: AuthenticatedUser) {
    return payload;
  }
}