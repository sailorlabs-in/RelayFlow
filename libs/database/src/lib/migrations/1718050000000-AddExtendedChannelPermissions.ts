import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtendedChannelPermissions1718050000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation"
      ADD COLUMN IF NOT EXISTS "hidden_from_role_ids" JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "read_user_ids" JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "write_user_ids" JSONB NOT NULL DEFAULT '[]';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation"
      DROP COLUMN IF EXISTS "hidden_from_role_ids",
      DROP COLUMN IF EXISTS "read_user_ids",
      DROP COLUMN IF EXISTS "write_user_ids";
    `);
  }
}
