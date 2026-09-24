import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlackTier1790400000000 implements MigrationInterface {
  name = 'AddBlackTier1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A ordem do enum importa: a garantia vigente é escolhida por
    // ORDER BY tier DESC, então black precisa vir depois de platinum.
    await queryRunner.query(`
      ALTER TYPE "user_tiers_tier_enum" ADD VALUE IF NOT EXISTS 'black' AFTER 'platinum'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // O Postgres não remove valores de um enum: rebaixa as garantias black
    // para platinum e recria o tipo sem o valor.
    await queryRunner.query(`
      UPDATE "user_tiers" SET "tier" = 'platinum' WHERE "tier" = 'black'
    `);
    await queryRunner.query(`
      ALTER TYPE "user_tiers_tier_enum" RENAME TO "user_tiers_tier_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "user_tiers_tier_enum" AS ENUM ('gold', 'platinum')
    `);
    await queryRunner.query(`
      ALTER TABLE "user_tiers"
      ALTER COLUMN "tier" TYPE "user_tiers_tier_enum"
        USING "tier"::text::"user_tiers_tier_enum"
    `);
    await queryRunner.query(`DROP TYPE "user_tiers_tier_enum_old"`);
  }
}
