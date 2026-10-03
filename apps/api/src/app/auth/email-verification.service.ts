import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'node:crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { MailService, MailTemplate } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { firstName } from '../users/first-name';
import { EmailVerificationCode } from './entities/email-verification-code.entity';

const DEFAULT_CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
// Evita que o mesmo e-mail seja bombardeado com pedidos seguidos.
const RESEND_COOLDOWN_MS = 60 * 1000;
const INVALID_CODE_MESSAGE =
  'Código inválido. Confira o e-mail e tente de novo.';
const EXPIRED_CODE_MESSAGE = 'Este código expirou. Peça um novo código.';
const NO_CODE_MESSAGE = 'Peça um novo código para confirmar seu e-mail.';
const TOO_MANY_ATTEMPTS_MESSAGE =
  'Código inválido. Você atingiu o limite de tentativas — peça um novo código.';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(EmailVerificationCode)
    private readonly codesRepository: Repository<EmailVerificationCode>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** Envio logo após o cadastro: em segundo plano, sem travar a resposta. */
  sendCodeInBackground(user: User): void {
    this.sendCode(user).catch((error) =>
      this.logger.error(
        `Falha ao enviar o código de verificação de e-mail`,
        error instanceof Error ? error.stack : String(error),
      ),
    );
  }

  async sendCode(user: User): Promise<void> {
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Seu e-mail já está confirmado.');
    }

    const recent = await this.codesRepository.exists({
      where: {
        userId: user.id,
        usedAt: IsNull(),
        createdAt: MoreThan(new Date(Date.now() - RESEND_COOLDOWN_MS)),
      },
    });
    if (recent) {
      throw new HttpException(
        'Acabamos de enviar um código. Aguarde um minuto para pedir outro.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttlMinutes = Number(
      this.configService.get(
        'EMAIL_VERIFICATION_CODE_TTL_MINUTES',
        DEFAULT_CODE_TTL_MINUTES,
      ),
    );

    // Só o código mais recente vale.
    await this.codesRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: () => 'now()' },
    );
    await this.codesRepository.insert({
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    await this.mailService.sendTemplate({
      to: { email: user.email, name: user.name },
      template: MailTemplate.EMAIL_VERIFICATION,
      variables: { firstName: firstName(user.name), code, ttlMinutes },
    });
  }

  /** Confere o código e marca o e-mail como confirmado. */
  async confirm(user: User, code: string): Promise<User> {
    if (user.emailVerifiedAt) return user;

    // O erro de código errado é lançado fora da transação: dentro dela, o
    // rollback desfaria a tentativa contada.
    const result = await this.dataSource.transaction(async (manager) => {
      const codes = manager.getRepository(EmailVerificationCode);
      // Lock na linha: tentativas simultâneas são serializadas, então o
      // limite de tentativas não é furado com requisições em paralelo.
      const current = await codes.findOne({
        where: { userId: user.id, usedAt: IsNull() },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current || current.attempts >= MAX_ATTEMPTS) {
        return { error: NO_CODE_MESSAGE };
      }
      if (current.expiresAt <= new Date()) {
        return { error: EXPIRED_CODE_MESSAGE };
      }

      if (current.codeHash !== hashCode(code)) {
        await codes.increment({ id: current.id }, 'attempts', 1);
        return {
          error:
            current.attempts + 1 < MAX_ATTEMPTS
              ? INVALID_CODE_MESSAGE
              : TOO_MANY_ATTEMPTS_MESSAGE,
        };
      }

      await codes.update(
        { userId: user.id, usedAt: IsNull() },
        { usedAt: () => 'now()' },
      );
      const users = manager.getRepository(User);
      await users.update(user.id, { emailVerifiedAt: new Date() });
      return { user: await users.findOneByOrFail({ id: user.id }) };
    });

    if ('error' in result) throw new BadRequestException(result.error);
    return result.user;
  }
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
