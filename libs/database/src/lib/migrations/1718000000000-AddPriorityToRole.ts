import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityToRole1718000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "group_role" 
      DROP COLUMN IF EXISTS "priority";
    `);
  }
}
