import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { ConversionRatesService } from './conversion-rates.service';
import { CreateConversionRateDto } from './dto/create-conversion-rate.dto';
import { CurrentRateQueryDto } from './dto/current-rate-query.dto';
import { UpdateConversionRateDto } from './dto/update-conversion-rate.dto';
import { PointsConversionRate } from './entities/points-conversion-rate.entity';

@UseGuards(JwtAuthGuard)
@Controller('points/rates')
export class ConversionRatesController {
  constructor(private readonly ratesService: ConversionRatesService) {}

  @Get('current')
  current(@Query() query: CurrentRateQueryDto): Promise<PointsConversionRate> {
    return this.ratesService.getCurrent(query.unit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  list(): Promise<PointsConversionRate[]> {
    return this.ratesService.listInEffect();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() superAdmin: User,
    @Body() dto: CreateConversionRateDto,
  ): Promise<PointsConversionRate> {
    return this.ratesService.create(dto, superAdmin.id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversionRateDto,
  ): Promise<PointsConversionRate> {
    return this.ratesService.setActive(id, dto.active);
  }
}
