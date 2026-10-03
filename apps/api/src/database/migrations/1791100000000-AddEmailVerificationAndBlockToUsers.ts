import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationAndBlockToUsers1791100000000 implements MigrationInterface {
  name = 'AddEmailVerificationAndBlockToUsers1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Códigos de 6 dígitos da confirmação de e-mail. Só o hash fica no banco.
    await queryRunner.query(`
      CREATE TABLE "email_verification_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code_hash" character(64) NOT NULL,
        "attempts" smallint NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verification_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_verification_codes_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_email_verification_codes_user_id"
      ON "email_verification_codes" ("user_id")
    `);

    // Bloqueio manual da conta pelo super-admin. A confirmação do e-mail usa
    // a coluna email_verified_at, que já existe.
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD "blocked_at" timestamptz,
        ADD "blocked_reason" character varying(500),
        ADD "blocked_by_id" uuid,
        ADD CONSTRAINT "FK_users_blocked_by_id" FOREIGN KEY ("blocked_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    // Contas que já existem: as do Google/Apple contam como verificadas (o
    // e-mail veio do provedor); as locais ficam pendentes até confirmar o
    // código. Sem down: não dá para saber o valor anterior de cada uma.
    await queryRunner.query(`
      UPDATE "users"
      SET "email_verified_at" = CASE
        WHEN "provider" = 'local' THEN NULL
        ELSE COALESCE("email_verified_at", now())
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT IF EXISTS "FK_users_blocked_by_id",
        DROP COLUMN IF EXISTS "blocked_by_id",
        DROP COLUMN IF EXISTS "blocked_reason",
        DROP COLUMN IF EXISTS "blocked_at"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_email_verification_codes_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verification_codes"`);
  }
}
