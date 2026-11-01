import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationCreatedBy1784893339000 implements MigrationInterface {
  name = 'AddConversationCreatedBy1784893339000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" ADD "created_by" character(24)`,
    );

    // Best-effort backfill for groups created before this column existed: the
    // creator is the first membership row added to the group.
    await queryRunner.query(
      `UPDATE "chat"."conversations" c
       SET "created_by" = (
         SELECT cm."user_id"
         FROM "chat"."conversation_members" cm
         WHERE cm."conversation_id" = c."id"
         ORDER BY cm."created_at" ASC
         LIMIT 1
       )
       WHERE c."type" = 'GROUP'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" DROP COLUMN "created_by"`,
    );
  }
}
