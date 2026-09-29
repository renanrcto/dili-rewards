import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1790700000000 implements MigrationInterface {
  name = 'CreateProductsTable1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "products_status_enum" AS ENUM ('active', 'inactive')
    `);
    // Separado do user_tiers_tier_enum porque aqui o standard também é uma
    // opção.
    await queryRunner.query(`
      CREATE TYPE "products_tier_enum" AS ENUM ('standard', 'gold', 'platinum', 'black')
    `);

    // Produtos da troca de pontos. A imagem fica no Cloudflare R2; aqui só a
    // URL pública. Troca parcial = partial_points + partial_price (R$), no
    // lugar dos points da troca integral.
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "category" varchar(60) NOT NULL,
        "description" text NOT NULL,
        "image_url" varchar(1024) NOT NULL,
        "points" integer NOT NULL,
        "status" "products_status_enum" NOT NULL DEFAULT 'active',
        "allows_partial_points" boolean NOT NULL DEFAULT false,
        "partial_points" integer,
        "partial_price" numeric(10,2),
        "allowed_tiers" "products_tier_enum"[] NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_products_points_positive" CHECK ("points" > 0),
        CONSTRAINT "CHK_products_partial" CHECK (
          ("allows_partial_points" = false AND "partial_points" IS NULL AND "partial_price" IS NULL)
          OR ("allows_partial_points" = true AND "partial_points" > 0
            AND "partial_points" < "points" AND "partial_price" > 0)
        ),
        CONSTRAINT "CHK_products_allowed_tiers_not_empty" CHECK (
          cardinality("allowed_tiers") > 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_status_created_at"
      ON "products" ("status", "created_at")
    `);
    // Filtro da listagem por categoria.
    await queryRunner.query(`
      CREATE INDEX "IDX_products_category" ON "products" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_category"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_status_created_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_tier_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_status_enum"`);
  }
}
