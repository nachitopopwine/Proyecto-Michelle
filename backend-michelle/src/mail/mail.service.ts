import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

// Envío de correos con Resend. Si RESEND_API_KEY no está configurada,
// los correos no se envían y solo quedan registrados en el log.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  get enabled() {
    return this.client !== null;
  }

  /** Devuelve true si el correo fue aceptado por el proveedor. Nunca lanza. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Correo NO enviado (RESEND_API_KEY no configurada): "${message.subject}" -> ${message.to}`);
      return false;
    }

    try {
      const { error } = await this.client.emails.send({
        from: process.env.MAIL_FROM ?? 'Michelle Morales Nutrición <onboarding@resend.dev>',
        to: message.to,
        subject: message.subject,
        html: layout(message.html),
        attachments: message.attachments,
      });
      if (error) {
        this.logger.error(`Error al enviar "${message.subject}" a ${message.to}: ${error.message}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar "${message.subject}" a ${message.to}: ${(error as Error).message}`);
      return false;
    }
  }
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
  <h2 style="color:#6b21a8">Michelle Morales · Nutrición Integral</h2>
  ${body}
  <p style="color:#64748b;font-size:12px;margin-top:32px">Este correo fue enviado automáticamente. Si tienes dudas, responde a tu nutricionista.</p>
</div>`;
}
