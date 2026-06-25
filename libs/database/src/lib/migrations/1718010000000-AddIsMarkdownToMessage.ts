import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsMarkdownToMessage1718010000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "is_markdown" boolean DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" DROP COLUMN IF EXISTS "is_markdown";
    `);
  }
}
