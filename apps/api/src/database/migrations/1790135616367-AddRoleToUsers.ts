import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUsers1790135616367 implements MigrationInterface {
  name = 'AddRoleToUsers1790135616367';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('customer', 'admin')
    `);

    // Usuários existentes viram 'customer'. Admins são promovidos
    // manualmente via SQL — não há endpoint para isso.
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "role" "users_role_enum" NOT NULL DEFAULT 'customer'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
