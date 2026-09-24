import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPointsController } from './admin-points.controller';
import { ConversionRatesController } from './conversion-rates.controller';
import { ConversionRatesService } from './conversion-rates.service';
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
  ],
  providers: [PointsService, ConversionRatesService, TiersService],
})
export class PointsModule {}
