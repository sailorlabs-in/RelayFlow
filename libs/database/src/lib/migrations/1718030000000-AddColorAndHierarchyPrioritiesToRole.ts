import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColorAndHierarchyPrioritiesToRole1718030000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      ADD COLUMN IF NOT EXISTS "color_priority" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "hierarchy_priority" integer DEFAULT 0;
    `);

    // Copy values of priority into new columns
    await queryRunner.query(`
      UPDATE "group_role" 
      SET "color_priority" = "priority", 
          "hierarchy_priority" = "priority";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      DROP COLUMN IF EXISTS "color_priority",
      DROP COLUMN IF EXISTS "hierarchy_priority";
    `);
  }
}
