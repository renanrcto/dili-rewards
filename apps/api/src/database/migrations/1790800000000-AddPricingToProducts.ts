import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPricingToProducts1790800000000 implements MigrationInterface {
  name = 'AddPricingToProducts1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Os pontos passam a ser calculados a partir do preço final e da taxa de
    // conversão (% do preço devolvido em pontos):
    //   points = round(final_price * conversion_rate)  (taxa em %, 2 a 8)
    // e a troca parcial a partir do custo:
    //   partial_price = round(cost * 1.1, 2), partial_points = round(points * 0.6)
    // points/partial_* continuam gravados (loja ordena e exibe por eles),
    // calculados pela API.
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "final_price" numeric(10,2),
        ADD COLUMN "conversion_rate" numeric(4,2),
        ADD COLUMN "cost" numeric(10,2)
    `);

    // Produtos já cadastrados: taxa de 5% e preço que reproduz os pontos
    // atuais; custo derivado do preço parcial atual.
    await queryRunner.query(`
      UPDATE "products" SET
        "conversion_rate" = 5,
        "final_price" = round("points" / 5.0, 2),
        "cost" = CASE WHEN "allows_partial_points"
          THEN round("partial_price" / 1.1, 2) END
    `);
    await queryRunner.query(`
      UPDATE "products" SET
        "partial_price" = round("cost" * 1.1, 2),
        "partial_points" = round("points" * 0.6)
      WHERE "allows_partial_points"
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
        ALTER COLUMN "final_price" SET NOT NULL,
        ALTER COLUMN "conversion_rate" SET NOT NULL,
        ADD CONSTRAINT "CHK_products_final_price_positive" CHECK ("final_price" > 0),
        ADD CONSTRAINT "CHK_products_conversion_rate_range" CHECK (
          "conversion_rate" BETWEEN 2 AND 8
        ),
        ADD CONSTRAINT "CHK_products_cost" CHECK (
          ("allows_partial_points" = false AND "cost" IS NULL)
          OR ("allows_partial_points" = true AND "cost" > 0)
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP CONSTRAINT IF EXISTS "CHK_products_cost",
        DROP CONSTRAINT IF EXISTS "CHK_products_conversion_rate_range",
        DROP CONSTRAINT IF EXISTS "CHK_products_final_price_positive",
        DROP COLUMN IF EXISTS "cost",
        DROP COLUMN IF EXISTS "conversion_rate",
        DROP COLUMN IF EXISTS "final_price"
    `);
  }
}
