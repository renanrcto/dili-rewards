import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRescuePointsTable1790136548113 implements MigrationInterface {
  name = 'CreateRescuePointsTable1790136548113';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Código de resgate gerado pelo admin no caixa e entregue ao cliente
    // via QR Code. O id (uuid v4, aleatório) é o próprio código — não dá
    // para ser adivinhado.
    await queryRunner.query(`
      CREATE TABLE "rescue_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by_id" uuid NOT NULL,
        "purchase_amount" numeric(12,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
        CONSTRAINT "PK_rescue_points_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_rescue_points_purchase_amount_positive" CHECK (
          "purchase_amount" > 0
        ),
        CONSTRAINT "CHK_rescue_points_expires_after_created" CHECK (
          "expires_at" > "created_at"
        ),
        CONSTRAINT "FK_rescue_points_created_by_id" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rescue_points_created_by_id"
      ON "rescue_points" ("created_by_id")
    `);

    // Cada código gera no máximo um crédito — o UNIQUE garante isso no
    // banco mesmo com duas leituras simultâneas do mesmo QR Code.
    // Sem DEFAULT: user_points ainda não tem dados em nenhum ambiente.
    await queryRunner.query(`
      ALTER TABLE "user_points"
      ADD "rescue_point_id" uuid NOT NULL,
      ADD CONSTRAINT "UQ_user_points_rescue_point_id" UNIQUE ("rescue_point_id"),
      ADD CONSTRAINT "FK_user_points_rescue_point_id"
        FOREIGN KEY ("rescue_point_id")
        REFERENCES "rescue_points" ("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_points"
      DROP CONSTRAINT IF EXISTS "FK_user_points_rescue_point_id",
      DROP CONSTRAINT IF EXISTS "UQ_user_points_rescue_point_id",
      DROP COLUMN IF EXISTS "rescue_point_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rescue_points_created_by_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_points"`);
  }
}
