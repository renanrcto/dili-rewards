import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PointsConversionRate } from './points-conversion-rate.entity';
import { RescuePoint } from './rescue-point.entity';

@Entity('user_points')
@Unique('UQ_user_points_rescue_point_id', ['rescuePointId'])
@Index('IDX_user_points_user_id_created_at', ['userId', 'createdAt'])
@Index('IDX_user_points_balance', ['userId', 'expiresAt'], {
  where: '"redeemed" = false',
})
@Index('IDX_user_points_credited_by_id', ['creditedById'])
@Check('CHK_user_points_positive', '"points" > 0')
@Check('CHK_user_points_purchase_amount_positive', '"purchase_amount" > 0')
@Check('CHK_user_points_expires_after_created', '"expires_at" > "created_at"')
export class UserPoints {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_points_user_id',
  })
  user?: User;

  // Admin que creditou os pontos (auditoria).
  @Column({ name: 'credited_by_id', type: 'uuid' })
  creditedById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'credited_by_id',
    foreignKeyConstraintName: 'FK_user_points_credited_by_id',
  })
  creditedBy?: User;

  // Valor da compra que gerou os pontos. O driver pg devolve numeric como
  // string, por isso o transformer.
  @Column({
    name: 'purchase_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  purchaseAmount!: number;

  // Código de resgate (QR Code) que originou o crédito.
  @Column({ name: 'rescue_point_id', type: 'uuid' })
  rescuePointId!: string;

  @ManyToOne(() => RescuePoint, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'rescue_point_id',
    foreignKeyConstraintName: 'FK_user_points_rescue_point_id',
  })
  rescuePoint?: RescuePoint;

  // Taxa usada no cálculo dos pontos (auditoria).
  @Column({ name: 'conversion_rate_id', type: 'uuid' })
  conversionRateId!: string;

  @ManyToOne(() => PointsConversionRate, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'conversion_rate_id',
    foreignKeyConstraintName: 'FK_user_points_conversion_rate_id',
  })
  conversionRate?: PointsConversionRate;

  @Column({ type: 'integer' })
  points!: number;

  @Column({ type: 'boolean', default: false })
  redeemed!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Default (created_at + 6 meses) é definido pela migration.
  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    default: () => "now() + interval '6 months'",
  })
  expiresAt!: Date;
}
