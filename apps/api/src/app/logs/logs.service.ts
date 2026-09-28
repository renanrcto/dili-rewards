import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { STORE_TIME_ZONE } from '../../config/store.config';
import { User } from '../users/entities/user.entity';
import { ListLogsQueryDto } from './dto/list-logs-query.dto';
import { AppLog, LogLevel } from './entities/app-log.entity';

export type LogEntry = Pick<AppLog, 'level' | 'message'> &
  Partial<Omit<AppLog, 'id' | 'level' | 'message' | 'createdAt'>>;

export interface LogItem {
  id: string;
  level: LogLevel;
  context: string | null;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: string | null;
  // null quando não há usuário ou ele já foi removido.
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface PaginatedLogs {
  items: LogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class LogsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Grava em segundo plano e nunca lança: um problema no banco não pode
   * derrubar a requisição que gerou o log. A falha vai direto para o
   * stderr — usar o Logger aqui faria o erro tentar se gravar de novo.
   */
  record(entry: LogEntry): void {
    // Logs do bootstrap (ex.: falha ao conectar no banco) chegam antes da
    // conexão existir; esses ficam só no console.
    if (!this.dataSource.isInitialized) {
      return;
    }

    this.dataSource
      .getRepository(AppLog)
      .insert(entry)
      .catch((error) =>
        process.stderr.write(
          `[LogsService] Falha ao gravar log no banco: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        ),
      );
  }

  /** Logs mais recentes primeiro, filtrados por dia (fuso da loja) e nível. */
  async list({
    from,
    to,
    level,
    page,
    limit,
  }: ListLogsQueryDto): Promise<PaginatedLogs> {
    // Intervalo em timestamptz (e não um cast da coluna) para aproveitar o
    // índice em created_at — mesmo padrão do relatório de pontos do dia.
    const query = this.dataSource
      .getRepository(AppLog)
      .createQueryBuilder('l')
      .leftJoin(User, 'u', 'u.id = l.user_id')
      .setParameter('tz', STORE_TIME_ZONE);
    if (from) {
      query.andWhere(
        `l.created_at >= CAST(CAST(:from AS date) AS timestamp) AT TIME ZONE :tz`,
        { from },
      );
    }
    if (to) {
      query.andWhere(
        `l.created_at < CAST(CAST(:to AS date) + 1 AS timestamp) AT TIME ZONE :tz`,
        { to },
      );
    }
    if (level) {
      query.andWhere('l.level = :level', { level });
    }

    const total = await query.getCount();
    const items = await query
      .select('l.id', 'id')
      .addSelect('l.level', 'level')
      .addSelect('l.context', 'context')
      .addSelect('l.message', 'message')
      .addSelect('l.stack', 'stack')
      .addSelect('l.method', 'method')
      .addSelect('l.path', 'path')
      .addSelect('l.status_code', 'statusCode')
      .addSelect('l.user_id', 'userId')
      .addSelect('u.email', 'userEmail')
      .addSelect('l.ip', 'ip')
      .addSelect('l.user_agent', 'userAgent')
      .addSelect('l.created_at', 'createdAt')
      .orderBy('l.created_at', 'DESC')
      .addOrderBy('l.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<LogItem>();

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Apaga os logs mais antigos que `days` dias; devolve quantos apagou. */
  async deleteOlderThan(days: number): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(AppLog)
      .where(`created_at < now() - make_interval(days => :days)`, { days })
      .execute();
    return result.affected ?? 0;
  }
}
