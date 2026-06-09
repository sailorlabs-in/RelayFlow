import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration Description:
 * This migration safely transitions the existing database to a relational model by preparing
 * orphaned data, ensuring no legacy data is lost.
 *
 * Context:
 * In the previous schema, foreign keys were not strictly enforced at the database level.
 * Therefore, rows could become "orphaned" (e.g., a message or group member referencing
 * a user ID that had since been deleted). Adding foreign keys directly would cause PostgreSQL
 * to crash during initialization due to these referential integrity violations.
 *
 * Solution:
 * 1. This migration runs BEFORE schema synchronization on startup.
 * 2. It queries all tables to collect any orphaned IDs (missing Users, Conversations, Groups, or Messages).
 * 3. It inserts safe, fallback placeholder entries for those missing IDs.
 * 4. This resolves all data discrepancies, allowing TypeORM to successfully alter the tables and
 *    create foreign key constraints without crashes.
 *
 * Execution Lifecycle:
 * This migration runs exactly ONCE per database. On all subsequent starts, TypeORM will see this
 * migration in the `migrations` metadata history table and skip it entirely.
 */
export class MigrateRelations1717910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Insert fallback placeholder users for any orphaned sender/owner/member/invite references
    await queryRunner.query(`
      INSERT INTO "user" (id, email, password_hash, display_name, is_verified, created_at, updated_at)
      SELECT 
          id,
          'fallback-' || id || '@relayflow.local',
          '$2b$10$placeholderhashplaceholderhashplaceholderhash',
          'Fallback User',
          true,
          NOW(),
          NOW()
      FROM (
          SELECT DISTINCT user_id AS id FROM conversation_member WHERE user_id NOT IN (SELECT id FROM "user")
          UNION
          SELECT DISTINCT sender_id AS id FROM message WHERE sender_id NOT IN (SELECT id FROM "user")
          UNION
          SELECT DISTINCT owner_id AS id FROM "group" WHERE owner_id NOT IN (SELECT id FROM "user")
          UNION
          SELECT DISTINCT user_id AS id FROM group_member WHERE user_id NOT IN (SELECT id FROM "user")
          UNION
          SELECT DISTINCT created_by AS id FROM group_invite WHERE created_by NOT IN (SELECT id FROM "user")
          UNION
          SELECT DISTINCT user_id AS id FROM read_receipt WHERE user_id NOT IN (SELECT id FROM "user")
      ) AS missing_users
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Insert fallback placeholder conversations for any orphaned members/messages
    await queryRunner.query(`
      INSERT INTO conversation (id, type, created_at, updated_at)
      SELECT 
          id,
          'dm',
          NOW(),
          NOW()
      FROM (
          SELECT DISTINCT conversation_id AS id FROM conversation_member WHERE conversation_id NOT IN (SELECT id FROM conversation)
          UNION
          SELECT DISTINCT conversation_id AS id FROM message WHERE conversation_id NOT IN (SELECT id FROM conversation)
      ) AS missing_conversations
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Insert fallback placeholder groups for any orphaned group members/invites
    await queryRunner.query(`
      INSERT INTO "group" (id, name, owner_id, created_at, updated_at)
      SELECT 
          missing_groups.id,
          'Fallback Group',
          COALESCE(
              (SELECT user_id FROM group_member WHERE group_id = missing_groups.id LIMIT 1),
              (SELECT created_by FROM group_invite WHERE group_id = missing_groups.id LIMIT 1),
              (SELECT id FROM "user" LIMIT 1)
          ),
          NOW(),
          NOW()
      FROM (
          SELECT DISTINCT group_id AS id FROM group_member WHERE group_id NOT IN (SELECT id FROM "group")
          UNION
          SELECT DISTINCT group_id AS id FROM group_invite WHERE group_id NOT IN (SELECT id FROM "group")
      ) AS missing_groups
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Insert fallback placeholder messages for any orphaned read receipts
    await queryRunner.query(`
      INSERT INTO message (id, conversation_id, sender_id, content, created_at, updated_at)
      SELECT 
          id,
          COALESCE(
              (SELECT conversation_id FROM read_receipt WHERE message_id = missing_messages.id LIMIT 1),
              (SELECT id FROM conversation LIMIT 1)
          ),
          COALESCE(
              (SELECT user_id FROM read_receipt WHERE message_id = missing_messages.id LIMIT 1),
              (SELECT id FROM "user" LIMIT 1)
          ),
          'Placeholder Message Content',
          NOW(),
          NOW()
      FROM (
          SELECT DISTINCT message_id AS id FROM read_receipt WHERE message_id NOT IN (SELECT id FROM message)
      ) AS missing_messages
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This is a data-only transition migration to resolve foreign key constraints
    // on legacy orphaned entries. A down migration is not strictly needed.
  }
}
