import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadOnlyAndNotificationPrefs1718020000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "is_read_only" boolean DEFAULT false;
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "notification_setting" varchar(20) DEFAULT 'all';
      ALTER TABLE "group_member" ADD COLUMN IF NOT EXISTS "is_muted" boolean DEFAULT false;
      ALTER TABLE "group_member" ADD COLUMN IF NOT EXISTS "notification_pref" varchar(20) DEFAULT 'all';
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "group_notification_pref" varchar(20) DEFAULT 'all';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "is_read_only";
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "notification_setting";
      ALTER TABLE "group_member" DROP COLUMN IF EXISTS "is_muted";
      ALTER TABLE "group_member" DROP COLUMN IF EXISTS "notification_pref";
      ALTER TABLE "user" DROP COLUMN IF EXISTS "group_notification_pref";
    `);
  }
}
