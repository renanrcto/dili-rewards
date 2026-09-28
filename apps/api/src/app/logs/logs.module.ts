import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseLogger } from './database.logger';
import { HttpExceptionFilter } from './http-exception.filter';
import { LogsCleanupService } from './logs-cleanup.service';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

@Module({
  controllers: [LogsController],
  providers: [
    LogsService,
    LogsCleanupService,
    DatabaseLogger,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [LogsService, DatabaseLogger],
})
export class LogsModule {}
