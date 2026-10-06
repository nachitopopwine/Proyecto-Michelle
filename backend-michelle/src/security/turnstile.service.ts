import { BadRequestException, Injectable } from '@nestjs/common';

type TurnstileResponse = {
  success: boolean;
};

@Injectable()
export class TurnstileService {
  async verify(token: string | undefined, remoteIp?: string) {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('La protección anti-bot no está configurada');
      }
      return;
    }

    if (!token) {
      throw new BadRequestException('La validación anti-bot es obligatoria');
    }

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new BadRequestException('No fue posible validar la protección anti-bot');
    }

    const result = (await response.json()) as TurnstileResponse;
    if (!result.success) {
      throw new BadRequestException('La validación anti-bot falló');
    }
  }
}