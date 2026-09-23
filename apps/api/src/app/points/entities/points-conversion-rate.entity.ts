import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('points_conversion_rates')
@Index('IDX_points_conversion_rates_current', ['createdAt'], {
  where: '"active" = true',
})
@Check('CHK_points_conversion_rates_positive', '"points_per_real" > 0')
export class PointsConversionRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Admin que cadastrou a taxa; NULL para a taxa inicial criada pelo seed.
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_points_conversion_rates_user_id',
  })
  user?: User;

  @Column({ name: 'points_per_real', type: 'integer' })
  pointsPerReal!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observation!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
