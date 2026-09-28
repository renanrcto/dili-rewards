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
  app.enableCors({ origin: process.env.WEB_APP_URL || 'http://localhost:4200' });
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
