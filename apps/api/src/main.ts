/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DatabaseLogger } from './app/logs/database.logger';

async function bootstrap() {
  // bufferLogs segura os logs do bootstrap até o DatabaseLogger assumir,
  // para que warn/error dessa fase também passem por ele.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(DatabaseLogger));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  // CORS_ORIGINS aceita várias origens separadas por vírgula (ex.: com e sem
  // www). Sem ela, vale só o WEB_APP_URL.
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    process.env.WEB_APP_URL ||
    'http://localhost:4200'
  )
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
