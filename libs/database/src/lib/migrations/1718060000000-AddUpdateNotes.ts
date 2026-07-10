import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `update_note` table for platform-wide admin announcements
 * and adds `last_seen_update_note_id` to the `user` table so each user
 * only sees new notes once.
 */
export class AddUpdateNotes1718060000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create update_note table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "update_note" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "title"       VARCHAR(255) NOT NULL,
        "content"     TEXT NOT NULL,
        "created_by"  UUID,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_update_note" PRIMARY KEY ("id"),
        CONSTRAINT "FK_update_note_created_by" FOREIGN KEY ("created_by")
          REFERENCES "user"("id") ON DELETE SET NULL
      );
    `);

    // 2. Add last_seen_update_note_id column to user
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "last_seen_update_note_id" UUID;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "last_seen_update_note_id";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "update_note";
    `);
  }
}
