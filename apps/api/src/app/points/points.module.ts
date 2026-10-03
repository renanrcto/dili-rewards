import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminPointsController } from './admin-points.controller';
import { ConversionRatesController } from './conversion-rates.controller';
import { ConversionRatesService } from './conversion-rates.service';
import { CustomersService } from './customers.service';
import { PointsConversionRate } from './entities/points-conversion-rate.entity';
import { RescuePoint } from './entities/rescue-point.entity';
import { UserPoints } from './entities/user-points.entity';
import { UserTier } from './entities/user-tier.entity';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { TiersService } from './tiers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPoints,
      PointsConversionRate,
      RescuePoint,
      UserTier,
    ]),
  ],
  controllers: [
    PointsController,
    ConversionRatesController,
    AdminPointsController,
    AdminCustomersController,
  ],
  providers: [
    PointsService,
    ConversionRatesService,
    TiersService,
    CustomersService,
  ],
})
export class PointsModule {}
