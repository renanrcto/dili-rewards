import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserPointsTable1790134128466 implements MigrationInterface {
  name = 'CreateUserPointsTable1790134128466';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cada linha é um crédito de pontos gerado por uma compra. A validade
    // de 6 meses é aplicada no próprio banco (DEFAULT) para que qualquer
    // caminho de inserção — API, script, SQL manual — respeite a regra.
    await queryRunner.query(`
      CREATE TABLE "user_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "credited_by_id" uuid NOT NULL,
        "purchase_amount" numeric(12,2) NOT NULL,
        "points" integer NOT NULL,
        "redeemed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '6 months'),
        CONSTRAINT "PK_user_points_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_user_points_positive" CHECK ("points" > 0),
        CONSTRAINT "CHK_user_points_purchase_amount_positive" CHECK (
          "purchase_amount" > 0
        ),
        CONSTRAINT "CHK_user_points_expires_after_created" CHECK (
          "expires_at" > "created_at"
        ),
        CONSTRAINT "FK_user_points_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        -- RESTRICT: o registro de auditoria não pode perder a referência
        -- a quem creditou os pontos.
        CONSTRAINT "FK_user_points_credited_by_id" FOREIGN KEY ("credited_by_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    // Histórico paginado do usuário, ordenado do mais recente.
    await queryRunner.query(`
      CREATE INDEX "IDX_user_points_user_id_created_at"
      ON "user_points" ("user_id", "created_at" DESC)
    `);

    // Cálculo de saldo: só interessam linhas ainda não resgatadas.
    await queryRunner.query(`
      CREATE INDEX "IDX_user_points_balance"
      ON "user_points" ("user_id", "expires_at")
      WHERE "redeemed" = false
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_points_credited_by_id"
      ON "user_points" ("credited_by_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_points_credited_by_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_points_balance"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_points_user_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_points"`);
  }
}
