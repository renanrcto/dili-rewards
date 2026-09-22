import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1790098068425 implements MigrationInterface {
  name = 'CreateUsersTable1790098068425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() vem do pgcrypto — disponível em qualquer Postgres
    // suportado, ao contrário de uuid-ossp (que exige superuser em alguns
    // provedores gerenciados).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "users_provider_enum" AS ENUM ('local', 'google', 'apple')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255),
        "provider" "users_provider_enum" NOT NULL DEFAULT 'local',
        "provider_id" character varying(255),
        "avatar_url" character varying(512),
        "email_verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_local_has_password" CHECK (
          ("provider" <> 'local') OR ("password_hash" IS NOT NULL)
        )
      )
    `);

    // Contas sociais (google/apple) precisam ser únicas por provider, mas
    // várias linhas locais com provider_id NULL não podem colidir entre si
    // — por isso o índice único é parcial (WHERE provider_id IS NOT NULL)
    // em vez de uma UNIQUE constraint normal.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_provider_provider_id"
      ON "users" ("provider", "provider_id")
      WHERE "provider_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_users_provider_provider_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_provider_enum"`);
  }
}
