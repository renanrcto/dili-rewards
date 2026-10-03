import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send';

// Templates criados no painel do Mailjet. O ID de cada um vem do .env.
export enum MailTemplate {
  PASSWORD_RESET = 'MAILJET_TEMPLATE_PASSWORD_RESET',
  EMAIL_VERIFICATION = 'MAILJET_TEMPLATE_EMAIL_VERIFICATION',
}

export interface TemplateMessage {
  to: { email: string; name: string };
  template: MailTemplate;
  // Preenchem os {{var:nome}} do template.
  variables: Record<string, string | number>;
}

interface MailjetSendResponse {
  Messages?: {
    Status: string;
    Errors?: { ErrorMessage: string }[];
  }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // Null quando o Mailjet não está configurado (ex.: dev local) — nesse caso
  // o e-mail só é escrito no log.
  private readonly authorization: string | null;
  private readonly from: { Email: string; Name: string };
  // Cópia dos erros de template (variável faltando, sintaxe) para este
  // endereço, em vez de o Mailjet descartar o envio em silêncio.
  private readonly errorReportingEmail: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('MAILJET_API_KEY');
    const secretKey = configService.get<string>('MAILJET_SECRET_KEY');
    this.authorization =
      apiKey && secretKey
        ? `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`
        : null;
    this.from = {
      Email: configService.get<string>(
        'MAIL_FROM_EMAIL',
        'no-reply@dilirewards.com',
      ),
      Name: configService.get<string>('MAIL_FROM_NAME', 'Dili Rewards'),
    };
    this.errorReportingEmail = configService.get<string>(
      'MAILJET_ERROR_REPORTING_EMAIL',
    );
  }

  async sendTemplate(message: TemplateMessage): Promise<void> {
    if (!this.authorization) {
      // O aviso vai para a tabela de logs; as variáveis, não — elas podem
      // ter o link de redefinição ou o código de verificação, então ficam
      // só no console.
      this.logger.warn(
        `Mailjet não configurado — e-mail para ${message.to.email} não enviado`,
      );
      this.logger.log(
        `${message.template}: ${JSON.stringify(message.variables)}`,
      );
      return;
    }

    const templateId = Number(this.configService.get(message.template));
    if (!templateId) {
      throw new Error(`${message.template} não configurado`);
    }

    const response = await fetch(MAILJET_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: this.authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: this.from,
            To: [{ Email: message.to.email, Name: message.to.name }],
            TemplateID: templateId,
            TemplateLanguage: true,
            Variables: message.variables,
            ...(this.errorReportingEmail && {
              TemplateErrorReporting: { Email: this.errorReportingEmail },
            }),
          },
        ],
      }),
    });

    const body = (await response.json().catch(() => null)) as
      (MailjetSendResponse & { ErrorMessage?: string }) | null;
    const sent = body?.Messages?.[0];
    if (!response.ok || sent?.Status !== 'success') {
      const reason =
        sent?.Errors?.map((error) => error.ErrorMessage).join('; ') ??
        body?.ErrorMessage ??
        `HTTP ${response.status}`;
      throw new Error(`Mailjet recusou o envio: ${reason}`);
    }
  }
}
