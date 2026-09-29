import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProductPointsFormula1790900000000 implements MigrationInterface {
  name = 'FixProductPointsFormula1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A taxa passa a ser gravada como fração (5 -> 0.05) e os pontos passam
    // a ser (preço final / taxa) * 100: R$ 9 a 5% = 18.000 pontos (antes
    // saía 9 * 5 = 45).
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP CONSTRAINT "CHK_products_conversion_rate_range",
        ALTER COLUMN "conversion_rate" TYPE numeric(5,4)
          USING "conversion_rate" / 100,
        ADD CONSTRAINT "CHK_products_conversion_rate_range" CHECK (
          "conversion_rate" BETWEEN 0.02 AND 0.08
        )
    `);

    // Mesmas contas de product-pricing.ts, inclusive a troca parcial (60%
    // dos pontos).
    await queryRunner.query(`
      UPDATE "products" SET
        "points" = round("final_price" / "conversion_rate" * 100),
        "partial_points" = CASE WHEN "allows_partial_points"
          THEN round(round("final_price" / "conversion_rate" * 100) * 0.6) END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP CONSTRAINT "CHK_products_conversion_rate_range",
        ALTER COLUMN "conversion_rate" TYPE numeric(4,2)
          USING "conversion_rate" * 100,
        ADD CONSTRAINT "CHK_products_conversion_rate_range" CHECK (
          "conversion_rate" BETWEEN 2 AND 8
        )
    `);
    await queryRunner.query(`
      UPDATE "products" SET
        "points" = round("final_price" * "conversion_rate"),
        "partial_points" = CASE WHEN "allows_partial_points"
          THEN round(round("final_price" * "conversion_rate") * 0.6) END
    `);
  }
}
