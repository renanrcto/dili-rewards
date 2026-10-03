import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { MailService, MailTemplate } from '../mail/mail.service';
import { AuthProvider, User } from '../users/entities/user.entity';
import { firstName } from '../users/first-name';
import { UsersService } from '../users/users.service';
import { BCRYPT_SALT_ROUNDS } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const DEFAULT_TOKEN_TTL_MINUTES = 60;
// Evita que o mesmo e-mail seja bombardeado com pedidos seguidos.
const RESEND_COOLDOWN_MS = 60 * 1000;
const INVALID_TOKEN_MESSAGE =
  'Este link é inválido ou expirou. Peça um novo para redefinir sua senha.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokensRepository: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Não revela se o e-mail existe: a resposta HTTP é sempre a mesma e o
   * envio roda em segundo plano, para que o tempo de resposta também não
   * denuncie contas cadastradas.
   */
  requestReset(email: string): void {
    this.sendResetEmail(email).catch((error) =>
      this.logger.error(
        `Falha ao enviar e-mail de redefinição de senha`,
        error instanceof Error ? error.stack : String(error),
      ),
    );
  }

  /** Troca a senha e devolve o usuário, para já iniciar a sessão. */
  async resetPassword(token: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    return this.dataSource.transaction(async (manager) => {
      // Marca o token como usado no mesmo UPDATE que o valida — dois
      // envios simultâneos do mesmo link não conseguem usá-lo duas vezes.
      const claimed = await manager
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ usedAt: () => 'now()' })
        .where('token_hash = :tokenHash', { tokenHash: hashToken(token) })
        .andWhere('used_at IS NULL')
        .andWhere('expires_at > now()')
        .returning(['user_id'])
        .execute();

      const userId = (claimed.raw as { user_id: string }[])[0]?.user_id;
      if (!userId) {
        throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      }

      const users = manager.getRepository(User);
      await users.update(userId, {
        passwordHash,
        // Relógio da API, não o now() do banco: é o mesmo que gera o `iat`
        // do JWT, então diferença de horário entre servidores não derruba a
        // sessão nova.
        passwordChangedAt: new Date(),
      });

      // Outros links pendentes do mesmo usuário deixam de valer.
      await manager
        .getRepository(PasswordResetToken)
        .update({ userId, usedAt: IsNull() }, { usedAt: () => 'now()' });

      return users.findOneByOrFail({ id: userId });
    });
  }

  private async sendResetEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Contas do Google/Apple não têm senha, e conta bloqueada não volta a
    // entrar trocando a senha — nos dois casos nada é enviado.
    if (!user || user.provider !== AuthProvider.LOCAL || user.blockedAt) {
      return;
    }

    const recent = await this.tokensRepository.exists({
      where: {
        userId: user.id,
        usedAt: IsNull(),
        createdAt: MoreThan(new Date(Date.now() - RESEND_COOLDOWN_MS)),
      },
    });
    if (recent) return;

    const token = randomBytes(32).toString('base64url');
    const ttlMinutes = Number(
      this.configService.get(
        'PASSWORD_RESET_TOKEN_TTL_MINUTES',
        DEFAULT_TOKEN_TTL_MINUTES,
      ),
    );

    // Só o link mais recente vale.
    await this.tokensRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: () => 'now()' },
    );
    await this.tokensRepository.insert({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    const webAppUrl = this.configService.get<string>(
      'WEB_APP_URL',
      'http://localhost:4200',
    );
    await this.mailService.sendTemplate({
      to: { email: user.email, name: user.name },
      template: MailTemplate.PASSWORD_RESET,
      variables: {
        firstName: firstName(user.name),
        link: `${webAppUrl}/redefinir-senha?token=${token}`,
        ttlMinutes,
      },
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
