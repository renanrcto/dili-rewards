import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CustomersService } from './customers.service';
import type { PaginatedCustomers } from './customers.service';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';

// Lista de clientes do painel gerencial (super-admin).
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query() query: ListCustomersQueryDto): Promise<PaginatedCustomers> {
    return this.customersService.list(query);
  }
}
