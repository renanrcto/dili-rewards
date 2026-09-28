import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Só warning e error vão para o banco — o resto fica apenas no console.
export enum LogLevel {
  WARN = 'warn',
  ERROR = 'error',
}

// Warnings e erros da API. Linhas de requisição HTTP (gravadas pelo
// filtro de exceções) têm method/path/status_code preenchidos; as vindas
// do Logger do Nest (ex.: falha ao enviar e-mail em segundo plano), não.
@Entity('logs')
@Index('IDX_logs_created_at', ['createdAt'])
@Index('IDX_logs_level_created_at', ['level', 'createdAt'])
export class AppLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: LogLevel, enumName: 'logs_level_enum' })
  level!: LogLevel;

  // Classe que gerou o log (ex.: MailService) ou 'HTTP'.
  @Column({ type: 'varchar', length: 120, nullable: true })
  context!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  stack!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  path!: string | null;

  @Column({ name: 'status_code', type: 'smallint', nullable: true })
  statusCode!: number | null;

  // Sem FK: o log continua valendo mesmo que o usuário seja removido.
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
