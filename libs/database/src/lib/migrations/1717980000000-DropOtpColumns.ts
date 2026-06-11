import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOtpColumns1717980000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN IF EXISTS "verification_otp",
      DROP COLUMN IF EXISTS "verification_otp_expires_at",
      DROP COLUMN IF EXISTS "two_factor_otp",
      DROP COLUMN IF EXISTS "two_factor_otp_expires_at";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "verification_otp" varchar DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "verification_otp_expires_at" timestamptz DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "two_factor_otp" varchar DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "two_factor_otp_expires_at" timestamptz DEFAULT NULL;
    `);
  }
}
