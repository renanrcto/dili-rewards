import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordChangedAtToUsers1790500000001 implements MigrationInterface {
  name = 'AddPasswordChangedAtToUsers1790500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usado pela JwtStrategy para invalidar sessões emitidas antes da última
    // troca de senha. Nulo para quem nunca trocou — nenhuma sessão atual cai.
    await queryRunner.query(`
      ALTER TABLE "users" ADD "password_changed_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "password_changed_at"
    `);
  }
}
