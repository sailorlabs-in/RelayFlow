import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaColumnToMessage1717920000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "media" jsonb DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" DROP COLUMN IF EXISTS "media";
    `);
  }
}
