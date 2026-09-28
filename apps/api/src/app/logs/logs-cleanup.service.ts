import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogsService } from './logs.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Apaga os logs mais antigos que LOGS_RETENTION_DAYS (padrão: 30) uma vez
 * ao subir a API e depois a cada 24h. Um setInterval basta: a API roda numa
 * instância só (pm2) e rodar a limpeza duas vezes não causa problema.
 */
@Injectable()
export class LogsCleanupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(LogsCleanupService.name);
  private readonly retentionDays: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly logsService: LogsService,
    configService: ConfigService,
  ) {
    this.retentionDays = Number(configService.get('LOGS_RETENTION_DAYS', 30));
  }

  onApplicationBootstrap(): void {
    void this.run();
    // unref: o timer não segura o processo aberto no shutdown.
    this.timer = setInterval(() => void this.run(), DAY_MS).unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const deleted = await this.logsService.deleteOlderThan(
        this.retentionDays,
      );
      if (deleted) {
        this.logger.log(
          `${deleted} log(s) com mais de ${this.retentionDays} dias apagado(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Falha ao apagar logs antigos',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
