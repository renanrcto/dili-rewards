import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from '../users/entities/user.entity';
import { LogLevel } from './entities/app-log.entity';
import { LogsService } from './logs.service';

/**
 * Grava toda requisição que termina em erro: 4xx como warn e 5xx como
 * error. A resposta continua sendo a padrão do Nest (super.catch).
 *
 * O corpo da requisição não é gravado de propósito — login, cadastro e
 * redefinição de senha trafegam senhas e tokens.
 */
@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly logsService: LogsService) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      this.record(exception, host.switchToHttp().getRequest<Request>());
    }
    super.catch(exception, host);
  }

  private record(exception: unknown, request: Request): void {
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = statusCode >= 500;

    this.logsService.record({
      level: isServerError ? LogLevel.ERROR : LogLevel.WARN,
      context: 'HTTP',
      message: errorMessage(exception),
      // Stack de 4xx é só o caminho até o `throw` esperado — não ajuda.
      stack:
        isServerError && exception instanceof Error ? exception.stack : null,
      method: request.method,
      path: request.originalUrl.slice(0, 2048),
      statusCode,
      // Só existe quando o JwtAuthGuard já autenticou a requisição.
      userId: (request.user as User | undefined)?.id ?? null,
      ip: clientIp(request),
      userAgent: request.headers['user-agent']?.slice(0, 512) ?? null,
    });
  }
}

function errorMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    // Erros do ValidationPipe trazem a lista de campos inválidos.
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
    return exception.message;
  }
  if (exception instanceof Error) return exception.message;
  return String(exception);
}

// Em produção a API fica atrás de proxy reverso, então o IP real do
// cliente vem no X-Forwarded-For.
function clientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();
  return (first || request.ip || null)?.slice(0, 64) ?? null;
}
