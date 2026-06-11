import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupSections1717970000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create group_section table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_section" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "group_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "allowed_role_ids" jsonb DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_section_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_group_section_group_id" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE
      );
    `);

    // 2. Add section_id and position to conversation
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "section_id" uuid;
    `);
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;
    `);

    // 3. Add FK from conversation(section_id) to group_section(id) ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "conversation" ADD CONSTRAINT "FK_conversation_section_id" FOREIGN KEY ("section_id") REFERENCES "group_section"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_section_id";
    `);
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "position";
    `);
    await queryRunner.query(`
      ALTER TABLE "conversation" DROP COLUMN IF EXISTS "section_id";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "group_section";
    `);
  }
}
