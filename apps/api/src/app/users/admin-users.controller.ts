import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { BlockUserDto } from './dto/block-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import type { AdminUserItem, PaginatedUsers } from './users.service';

// Gestão das contas (super-admin): consulta e bloqueio manual.
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto): Promise<PaginatedUsers> {
    return this.usersService.list(query);
  }

  // O super-admin que bloqueia é sempre o autenticado — nunca vem do body.
  @HttpCode(HttpStatus.OK)
  @Post(':id/block')
  block(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockUserDto,
  ): Promise<AdminUserItem> {
    return this.usersService.block(id, admin, dto.reason);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/unblock')
  unblock(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserItem> {
    return this.usersService.unblock(id);
  }
}
