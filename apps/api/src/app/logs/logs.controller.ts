import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ListLogsQueryDto } from './dto/list-logs-query.dto';
import { LogsService } from './logs.service';
import type { PaginatedLogs } from './logs.service';

// Consulta dos logs gravados (somente super-admin).
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  list(@Query() query: ListLogsQueryDto): Promise<PaginatedLogs> {
    return this.logsService.list(query);
  }
}
