import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DailyPointsQueryDto } from './dto/daily-points-query.dto';
import { PointsService } from './points.service';
import type { DailyPointsReport } from './points.service';

// Painel gerencial do programa de rewards (super-admin).
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/points')
export class AdminPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('daily')
  daily(@Query() query: DailyPointsQueryDto): Promise<DailyPointsReport> {
    return this.pointsService.getDailyCredits(query.date);
  }
}
