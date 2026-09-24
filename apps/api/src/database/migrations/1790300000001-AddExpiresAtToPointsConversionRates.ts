import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiresAtToPointsConversionRates1790300000001 implements MigrationInterface {
  name = 'AddExpiresAtToPointsConversionRates1790300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Taxa promocional (boost) com prazo: depois de expires_at ela deixa de
    // ser a vigente e a taxa volta sozinha para a ativa anterior (a padrão).
    // NULL = taxa sem prazo.
    await queryRunner.query(`
      ALTER TABLE "points_conversion_rates"
      ADD "expires_at" timestamptz,
      ADD CONSTRAINT "CHK_points_conversion_rates_expires_after_created"
        CHECK ("expires_at" IS NULL OR "expires_at" > "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "points_conversion_rates"
      DROP CONSTRAINT IF EXISTS "CHK_points_conversion_rates_expires_after_created",
      DROP COLUMN IF EXISTS "expires_at"
    `);
  }
}
