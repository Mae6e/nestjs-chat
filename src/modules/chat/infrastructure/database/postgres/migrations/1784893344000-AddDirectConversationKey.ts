import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a deterministic key for DIRECT conversations so a pair of users can
 * only have one active conversation, regardless of who starts it (A→B and
 * B→A produce the same key).
 *
 * The unique index is partial: legacy rows and soft-deleted conversations keep
 * `direct_key` NULL / are excluded, so existing data is never rejected and a
 * chat can be created again after both sides delete the previous one.
 */
export class AddDirectConversationKey1784893344000 implements MigrationInterface {
  name = 'AddDirectConversationKey1784893344000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" ADD "direct_key" character varying(49)`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "conversations_direct_key_uniq" ON "chat"."conversations" ("direct_key") WHERE "direct_key" IS NOT NULL AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "chat"."conversations_direct_key_uniq"`,
    );

    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" DROP COLUMN "direct_key"`,
    );
  }
}
