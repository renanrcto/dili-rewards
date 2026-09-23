import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PointsConversionRate } from '../app/points/entities/points-conversion-rate.entity';
import { RescuePoint } from '../app/points/entities/rescue-point.entity';
import { UserPoints } from '../app/points/entities/user-points.entity';
import { User } from '../app/users/entities/user.entity';

export function buildDatabaseConfig(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'dili_rewards'),
    entities: [User, UserPoints, PointsConversionRate, RescuePoint],
    // Schema é gerenciado só pelas migrations (src/database/migrations) —
    // nunca pelo synchronize, mesmo em desenvolvimento.
    synchronize: false,
    autoLoadEntities: false,
  };
}
