import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperAdminRole1790300000000 implements MigrationInterface {
  name = 'AddSuperAdminRole1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Super-admins também são promovidos manualmente via SQL:
    //
    //   UPDATE users SET role = 'super_admin' WHERE email = '<e-mail>';
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // O Postgres não remove valores de um enum: rebaixa os super-admins e
    // recria o tipo sem o valor.
    await queryRunner.query(`
      UPDATE "users" SET "role" = 'admin' WHERE "role" = 'super_admin'
    `);
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" RENAME TO "users_role_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('customer', 'admin')
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" DROP DEFAULT,
      ALTER COLUMN "role" TYPE "users_role_enum"
        USING "role"::text::"users_role_enum",
      ALTER COLUMN "role" SET DEFAULT 'customer'
    `);
    await queryRunner.query(`DROP TYPE "users_role_enum_old"`);
  }
}
