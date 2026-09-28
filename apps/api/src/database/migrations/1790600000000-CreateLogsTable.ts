import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogsTable1790600000000 implements MigrationInterface {
  name = 'CreateLogsTable1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "logs_level_enum" AS ENUM ('warn', 'error')
    `);

    // Warnings e erros da API. Sem FK em user_id para o log sobreviver à
    // remoção do usuário.
    await queryRunner.query(`
      CREATE TABLE "logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "level" "logs_level_enum" NOT NULL,
        "context" varchar(120),
        "message" text NOT NULL,
        "stack" text,
        "method" varchar(10),
        "path" varchar(2048),
        "status_code" smallint,
        "user_id" uuid,
        "ip" varchar(64),
        "user_agent" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_logs_created_at" ON "logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_logs_level_created_at" ON "logs" ("level", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_logs_level_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_logs_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "logs_level_enum"`);
  }
}
