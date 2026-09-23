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

// Standard é o nível padrão e nunca é gravado — só níveis acima dele.
export enum GrantedTier {
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum TierSource {
  // Subida de nível pela regra de visitas/pontos, gravada na leitura do
  // QR Code.
  ACTIVITY = 'activity',
  // Nível forçado (ex.: investidor-anjo), sem passar pela regra.
  MANUAL = 'manual',
}

// Histórico de níveis concedidos ao usuário. Cada linha garante o nível até
// `locked_until`, mesmo que a atividade caia depois; o nível vigente é o
// maior entre as linhas ainda válidas e a atividade atual.
@Entity('user_tiers')
@Index('IDX_user_tiers_user_id_created_at', ['userId', 'createdAt'])
@Check(
  'CHK_user_tiers_activity_locked_until',
  `"source" = 'manual' OR "locked_until" IS NOT NULL`,
)
export class UserTier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_tiers_user_id',
  })
  user?: User;

  @Column({ type: 'enum', enum: GrantedTier, enumName: 'user_tiers_tier_enum' })
  tier!: GrantedTier;

  @Column({
    type: 'enum',
    enum: TierSource,
    enumName: 'user_tiers_source_enum',
  })
  source!: TierSource;

  // Até quando o nível é garantido. NULL só para nível manual, que vale
  // até ser revogado.
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observation!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
