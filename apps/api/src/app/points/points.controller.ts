import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateRescueDto } from './dto/create-rescue.dto';
import { CreditPointsDto } from './dto/credit-points.dto';
import { ListPointsQueryDto } from './dto/list-points-query.dto';
import { PointsService } from './points.service';
import type {
  PaginatedPointsHistory,
  PointsBalance,
  PointsHistoryItem,
  RescueCode,
  RescueCodeStatus,
} from './points.service';
import { TiersService } from './tiers.service';
import type { UserTierStatus } from './tiers.service';

@UseGuards(JwtAuthGuard)
@Controller('points')
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly tiersService: TiersService,
  ) {}

  // Admin no caixa gera o código que vai no QR Code. O admin é sempre
  // quem está autenticado — nunca aceito pelo body — para que o registro
  // de auditoria não possa ser forjado.
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Post('rescues')
  createRescue(
    @CurrentUser() admin: User,
    @Body() dto: CreateRescueDto,
  ): Promise<RescueCode> {
    return this.pointsService.createRescue(dto, admin.id);
  }

  // Tela de venda consulta (polling) se o QR Code já foi lido ou expirou.
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Get('rescues/:code')
  rescueStatus(
    @Param('code', ParseUUIDPipe) code: string,
  ): Promise<RescueCodeStatus> {
    return this.pointsService.getRescueStatus(code);
  }

  // Cliente resgata o código lido no QR Code; os pontos vão sempre para o
  // usuário logado.
  @Post()
  credit(
    @CurrentUser() user: User,
    @Body() dto: CreditPointsDto,
  ): Promise<PointsHistoryItem> {
    return this.pointsService.credit(dto.code, user.id);
  }

  @Get('balance')
  balance(@CurrentUser() user: User): Promise<PointsBalance> {
    return this.pointsService.getBalance(user.id);
  }

  // Nível do usuário (standard/gold/platinum/black): o maior entre a garantia
  // gravada na subida de nível (ou forçada) e a atividade dos últimos
  // 2 meses.
  @Get('tier')
  tier(@CurrentUser() user: User): Promise<UserTierStatus> {
    return this.tiersService.getStatus(user.id);
  }

  @Get('history')
  history(
    @CurrentUser() user: User,
    @Query() query: ListPointsQueryDto,
  ): Promise<PaginatedPointsHistory> {
    return this.pointsService.getHistory(user.id, query);
  }
}
