import { createHash } from 'crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds platform admin system columns:
 *  - user.role           VARCHAR DEFAULT 'user'  — platform-wide role ('user' | 'admin')
 *  - user.warnings       JSONB   DEFAULT '[]'    — list of warning messages sent to user
 *  - group_member.is_ghost BOOLEAN DEFAULT false — ghost mode: admin is hidden from member list in this group
 *
 * And seeds the default platform admin account:
 *   Email    : service@sailorlabs.in
 *   Password : Demo@123
 *   Role     : admin
 */
export class AddAdminRoleAndGhostMode1718040000000
  implements MigrationInterface
{
  private readonly EMAIL = 'service@sailorlabs.in';
  private readonly DISPLAY_NAME = 'SailorLabs Service';
  private readonly USERNAME = 'sailorlabs_admin';
  private readonly PASSWORD = 'Demo@123';

  // Fixed salt — keeps this migration deterministic and idempotent
  private readonly SALT = 'b3c4d5e6f7a89012345678901234bcde';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Platform role on user
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'user';
    `);

    // 2. Warnings array on user
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "warnings" JSONB NOT NULL DEFAULT '[]';
    `);

    // 3. Ghost mode on group_member
    await queryRunner.query(`
      ALTER TABLE "group_member"
      ADD COLUMN IF NOT EXISTS "is_ghost" BOOLEAN NOT NULL DEFAULT false;
    `);

    // 4. Seed the default admin
    const hash = createHash('sha256')
      .update(this.SALT + this.PASSWORD)
      .digest('hex');
    const passwordHash = `${this.SALT}:${hash}`;

    await queryRunner.query(
      `
      INSERT INTO "user" (
        id,
        email,
        username,
        password_hash,
        display_name,
        role,
        is_verified,
        status,
        visibility,
        notifications_enabled,
        notifications_dm_enabled,
        notifications_group_enabled,
        notifications_in_app_enabled,
        notifications_friend_request_enabled,
        is_two_factor_enabled,
        two_factor_only_new_device,
        theme_mode,
        theme_schema,
        group_notification_pref,
        warnings,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        'admin',
        true,
        'online',
        'everyone',
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        'system',
        'arctic_glass',
        'all',
        '[]',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
        SET role = 'admin',
            is_verified = true,
            updated_at = NOW()
      ;
      `,
      [this.EMAIL, this.USERNAME, passwordHash, this.DISPLAY_NAME],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Delete the seeded admin
    await queryRunner.query(
      `DELETE FROM "user" WHERE email = $1 AND role = 'admin'`,
      [this.EMAIL],
    );

    // 2. Drop columns
    await queryRunner.query(`
      ALTER TABLE "group_member"
      DROP COLUMN IF EXISTS "is_ghost";
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "warnings";
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "role";
    `);
  }
}
