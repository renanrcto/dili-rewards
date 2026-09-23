import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointsConversionRatesTable1790134999107 implements MigrationInterface {
  name = 'CreatePointsConversionRatesTable1790134999107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Taxa de conversão R$ -> pontos. A taxa vigente é a linha ativa mais
    // recente: um boost é criado como nova linha e, ao desativá-lo, a
    // taxa volta automaticamente para a ativa anterior.
    await queryRunner.query(`
      CREATE TABLE "points_conversion_rates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "points_per_real" integer NOT NULL,
        "observation" character varying(500),
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_points_conversion_rates_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_points_conversion_rates_positive" CHECK (
          "points_per_real" > 0
        ),
        -- user_id NULL = linha criada pelo sistema (seed inicial).
        CONSTRAINT "FK_points_conversion_rates_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_points_conversion_rates_current"
      ON "points_conversion_rates" ("created_at")
      WHERE "active" = true
    `);

    await queryRunner.query(`
      INSERT INTO "points_conversion_rates" ("points_per_real", "observation")
      VALUES (100, 'Taxa padrão inicial')
    `);

    // Cada crédito guarda a taxa usada no cálculo (auditoria). Sem DEFAULT:
    // a tabela user_points ainda não tem dados em nenhum ambiente.
    await queryRunner.query(`
      ALTER TABLE "user_points"
      ADD "conversion_rate_id" uuid NOT NULL,
      ADD CONSTRAINT "FK_user_points_conversion_rate_id"
        FOREIGN KEY ("conversion_rate_id")
        REFERENCES "points_conversion_rates" ("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_points"
      DROP CONSTRAINT IF EXISTS "FK_user_points_conversion_rate_id",
      DROP COLUMN IF EXISTS "conversion_rate_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_points_conversion_rates_current"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "points_conversion_rates"`);
  }
}
