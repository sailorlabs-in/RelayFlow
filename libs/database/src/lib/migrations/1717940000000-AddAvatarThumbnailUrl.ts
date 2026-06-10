import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarThumbnailUrl1717940000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "avatar_thumbnail_url" varchar DEFAULT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN IF NOT EXISTS "avatar_thumbnail_url" text DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "avatar_thumbnail_url";
    `);
    await queryRunner.query(`
      ALTER TABLE "group" DROP COLUMN IF EXISTS "avatar_thumbnail_url";
    `);
  }
}
