import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEditedFieldsToMessage1717950000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "is_edited" boolean DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "edited_at" timestamptz DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" DROP COLUMN IF EXISTS "is_edited";
    `);
    await queryRunner.query(`
      ALTER TABLE "message" DROP COLUMN IF EXISTS "edited_at";
    `);
  }
}
