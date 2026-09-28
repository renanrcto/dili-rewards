import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  // Null quando o SMTP não está configurado (ex.: dev local) — nesse caso o
  // e-mail só é escrito no log.
  private readonly transporter: Transporter | null;

  constructor(configService: ConfigService) {
    const host = configService.get<string>('SMTP_HOST');
    this.from = configService.get<string>(
      'MAIL_FROM',
      'Dili Rewards <no-reply@dilirewards.com>',
    );
    this.transporter = host
      ? createTransport({
          host,
          port: Number(configService.get('SMTP_PORT', 587)),
          // true só para a porta 465 (TLS direto); 587 usa STARTTLS.
          secure: configService.get<string>('SMTP_SECURE') === 'true',
          auth: configService.get<string>('SMTP_USER')
            ? {
                user: configService.get<string>('SMTP_USER'),
                pass: configService.get<string>('SMTP_PASSWORD'),
              }
            : undefined,
        })
      : null;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      // O aviso vai para a tabela de logs; o conteúdo, não — ele pode ter
      // o link de redefinição de senha, então fica só no console.
      this.logger.warn(
        `SMTP não configurado — e-mail para ${message.to} não enviado`,
      );
      this.logger.log(message.text);
      return;
    }

    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
