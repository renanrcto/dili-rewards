import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTiersTable1790200000000 implements MigrationInterface {
  name = 'CreateUserTiersTable1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_tiers_tier_enum" AS ENUM ('gold', 'platinum')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_tiers_source_enum" AS ENUM ('activity', 'manual')
    `);

    // Histórico de níveis concedidos. 'activity' é gravado na leitura do
    // QR Code quando o usuário sobe de nível e fica garantido por 3 meses.
    // 'manual' (ex.: investidor-anjo) é inserido via SQL, sem endpoint:
    //
    //   INSERT INTO user_tiers (user_id, tier, source, observation)
    //   VALUES ('<user id>', 'platinum', 'manual', 'Investidor-anjo');
    //
    // e revogado com UPDATE ... SET revoked_at = now().
    await queryRunner.query(`
      CREATE TABLE "user_tiers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "tier" "user_tiers_tier_enum" NOT NULL,
        "source" "user_tiers_source_enum" NOT NULL,
        "locked_until" timestamptz,
        "revoked_at" timestamptz,
        "observation" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_tiers_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_user_tiers_activity_locked_until" CHECK (
          "source" = 'manual' OR "locked_until" IS NOT NULL
        ),
        CONSTRAINT "FK_user_tiers_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_tiers_user_id_created_at"
      ON "user_tiers" ("user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_tiers_user_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tiers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_tiers_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_tiers_tier_enum"`);
  }
}
