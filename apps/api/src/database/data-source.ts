import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PointsConversionRate } from '../app/points/entities/points-conversion-rate.entity';
import { RescuePoint } from '../app/points/entities/rescue-point.entity';
import { UserPoints } from '../app/points/entities/user-points.entity';
import { User } from '../app/users/entities/user.entity';

/**
 * DataSource usado pela CLI do TypeORM (geração/execução de migrations).
 * A aplicação NestJS em si usa `apps/api/src/config/database.config.ts`,
 * mas ambos devem apontar para o mesmo schema/entidades.
 */
// A CLI do TypeORM exige que o arquivo exporte só uma instância de
// DataSource — por isso apenas o `export default` (sem export nomeado
// adicional).
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dili_rewards',
  entities: [User, UserPoints, PointsConversionRate, RescuePoint],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
