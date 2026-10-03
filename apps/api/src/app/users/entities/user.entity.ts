import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum UserRole {
  CUSTOMER = 'customer',
  // Operador do caixa: gera o QR Code de pontos das vendas.
  ADMIN = 'admin',
  // Gestor do programa: painel gerencial e taxas de conversão.
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
@Index('UQ_users_provider_provider_id', ['provider', 'providerId'], {
  unique: true,
  where: '"provider_id" IS NOT NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({
    name: 'provider_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerId!: string | null;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  avatarUrl!: string | null;

  // Null = e-mail ainda não confirmado: a conta fica pendente e não pode
  // trocar pontos. Contas do Google/Apple já nascem verificadas; as locais
  // confirmam com o código enviado por e-mail.
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  // Bloqueio manual pelo super-admin (ex.: uso indevido dos QR Codes). Conta
  // bloqueada não entra e perde as sessões abertas (ver JwtStrategy).
  @Column({ name: 'blocked_at', type: 'timestamptz', nullable: true })
  blockedAt!: Date | null;

  @Column({
    name: 'blocked_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  blockedReason!: string | null;

  // Super-admin que bloqueou (auditoria).
  @Column({ name: 'blocked_by_id', type: 'uuid', nullable: true })
  blockedById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'blocked_by_id',
    foreignKeyConstraintName: 'FK_users_blocked_by_id',
  })
  blockedBy?: User | null;

  // Tokens de sessão emitidos antes desta data deixam de valer (ver
  // JwtStrategy). Null = senha nunca trocada.
  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
