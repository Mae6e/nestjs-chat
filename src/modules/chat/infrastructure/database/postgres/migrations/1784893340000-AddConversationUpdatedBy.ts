import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationUpdatedBy1784893340000 implements MigrationInterface {
  name = 'AddConversationUpdatedBy1784893340000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" ADD "updated_by" character(24)`,
    );

    // Groups created before this column existed were last touched by the user
    // who created them.
    await queryRunner.query(
      `UPDATE "chat"."conversations"
       SET "updated_by" = "created_by"
       WHERE "type" = 'GROUP' AND "created_by" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" DROP COLUMN "updated_by"`,
    );
  }
}
