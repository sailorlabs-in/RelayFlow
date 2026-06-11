import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolesAndChannelLayouts1717960000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create group_role table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_role" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "group_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "color" character varying(7) NOT NULL DEFAULT '#7289da',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_role_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_group_role_group_id" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE
      );
    `);

    // 2. Add role_ids to group_member
    await queryRunner.query(`
      ALTER TABLE "group_member" ADD COLUMN IF NOT EXISTS "role_ids" jsonb DEFAULT '[]'::jsonb;
    `);

    // 3. Add layout and allowed_role_ids to conversation
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "layout" character varying(20) DEFAULT 'text';
    `);
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "allowed_role_ids" jsonb DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "allowed_role_ids";
    `);
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "layout";
    `);
    await queryRunner.query(`
      ALTER TABLE "group_member" DROP COLUMN IF EXISTS "role_ids";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "group_role";
    `);
  }
}
