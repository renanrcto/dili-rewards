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

@Entity('rescue_points')
@Index('IDX_rescue_points_created_by_id', ['createdById'])
@Check('CHK_rescue_points_purchase_amount_positive', '"purchase_amount" > 0')
@Check('CHK_rescue_points_expires_after_created', '"expires_at" > "created_at"')
export class RescuePoint {
  // O id é o código que vai no QR Code.
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Admin que gerou o código no caixa.
  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'created_by_id',
    foreignKeyConstraintName: 'FK_rescue_points_created_by_id',
  })
  createdBy?: User;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Default (created_at + 5 minutos) é definido pela migration.
  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    default: () => "now() + interval '5 minutes'",
  })
  expiresAt!: Date;
}
