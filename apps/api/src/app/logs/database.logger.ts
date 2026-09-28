import { ConsoleLogger, Injectable } from '@nestjs/common';
import { LogLevel } from './entities/app-log.entity';
import { LogsService } from './logs.service';

// O ExceptionsHandler do Nest loga os erros 5xx sem dados da requisição; o
// HttpExceptionFilter já grava esses erros com método, rota e usuário.
const SKIPPED_CONTEXTS = new Set(['ExceptionsHandler']);

/**
 * Logger da aplicação: escreve tudo no console, como o padrão do Nest, e
 * também grava warn/error na tabela `logs`. Vale para qualquer
 * `new Logger(...)` usado nos services.
 */
@Injectable()
export class DatabaseLogger extends ConsoleLogger {
  constructor(private readonly logsService: LogsService) {
    super();
  }

  // O Logger do Nest chama como warn(message, context).
  override warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...optionalParams);
    const context = optionalParams.at(-1);
    this.persist(LogLevel.WARN, message, undefined, context);
  }

  // O Logger do Nest chama como error(message, stack, context).
  override error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);
    // Chamado com um parâmetro só, ele é stack se tiver várias linhas e
    // contexto caso contrário.
    const [stack, context] =
      optionalParams.length >= 2
        ? optionalParams.slice(-2)
        : isStack(optionalParams[0])
          ? [optionalParams[0]]
          : [undefined, optionalParams[0]];
    this.persist(LogLevel.ERROR, message, stack, context);
  }

  private persist(
    level: LogLevel,
    message: unknown,
    stack: unknown,
    context: unknown,
  ): void {
    const contextName = typeof context === 'string' ? context : null;
    if (contextName && SKIPPED_CONTEXTS.has(contextName)) {
      return;
    }

    this.logsService.record({
      level,
      context: contextName,
      message: stringify(message),
      stack:
        typeof stack === 'string'
          ? stack
          : message instanceof Error
            ? (message.stack ?? null)
            : null,
    });
  }
}

function stringify(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.message;
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function isStack(value: unknown): boolean {
  return typeof value === 'string' && value.includes('\n');
}
