import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('email_verification_codes')
@Index('IDX_email_verification_codes_user_id', ['userId'])
export class EmailVerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_email_verification_codes_user_id',
  })
  user?: User;

  // SHA-256 (hex) do código enviado por e-mail, como nos tokens de
  // redefinição de senha. Com só 6 dígitos o hash não protege sozinho — quem
  // segura a força bruta é o limite de tentativas.
  @Column({ name: 'code_hash', type: 'char', length: 64 })
  codeHash!: string;

  // Tentativas erradas com este código; no limite ele deixa de valer.
  @Column({ type: 'smallint', default: 0 })
  attempts!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  // Preenchido quando o código é usado ou invalidado por um pedido mais novo.
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
