import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyMediaColumnsFromMessage1717930000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" 
      DROP COLUMN IF EXISTS "media_url",
      DROP COLUMN IF EXISTS "media_type",
      DROP COLUMN IF EXISTS "media_name",
      DROP COLUMN IF EXISTS "media_size";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message" 
      ADD COLUMN "media_url" text DEFAULT NULL,
      ADD COLUMN "media_type" varchar(100) DEFAULT NULL,
      ADD COLUMN "media_name" varchar(255) DEFAULT NULL,
      ADD COLUMN "media_size" integer DEFAULT NULL;
    `);
  }
}
