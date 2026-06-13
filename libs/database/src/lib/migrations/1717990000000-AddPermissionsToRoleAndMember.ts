import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionsToRoleAndMember1717990000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '[]';

      ALTER TABLE "group_member" 
      ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '[]';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      DROP COLUMN IF EXISTS "permissions";

      ALTER TABLE "group_member" 
      DROP COLUMN IF EXISTS "permissions";
    `);
  }
}
