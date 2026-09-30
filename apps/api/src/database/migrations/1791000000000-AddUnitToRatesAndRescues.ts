import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitToRatesAndRescues1791000000000 implements MigrationInterface {
  name = 'AddUnitToRatesAndRescues1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "store_unit_enum" AS ENUM ('lucas', 'centro', 'alvinopolis')
    `);

    // Promoções (boosts) valem para uma unidade. NULL = todas as unidades:
    // é o caso da taxa padrão e dos boosts criados antes desta migration.
    // A taxa padrão nunca é por unidade.
    await queryRunner.query(`
      ALTER TABLE "points_conversion_rates"
      ADD "unit" "store_unit_enum",
      ADD CONSTRAINT "CHK_points_conversion_rates_unit_only_on_boost"
        CHECK ("unit" IS NULL OR "expires_at" IS NOT NULL)
    `);

    // Unidade em que a venda aconteceu; define a taxa usada no crédito.
    // NULL só nos códigos gerados antes desta migration.
    await queryRunner.query(`
      ALTER TABLE "rescue_points" ADD "unit" "store_unit_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rescue_points" DROP COLUMN IF EXISTS "unit"
    `);
    await queryRunner.query(`
      ALTER TABLE "points_conversion_rates"
      DROP CONSTRAINT IF EXISTS "CHK_points_conversion_rates_unit_only_on_boost",
      DROP COLUMN IF EXISTS "unit"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "store_unit_enum"`);
  }
}
