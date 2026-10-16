import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotReactionsToUser1718070000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "hot_reactions" TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "hot_reactions";
    `);
  }
}
