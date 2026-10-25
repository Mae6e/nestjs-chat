import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationMemberUpdatedBy1784893340002 implements MigrationInterface {
  name = 'AddConversationMemberUpdatedBy1784893340002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ADD "updated_by" character(24)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" DROP COLUMN "updated_by"`,
    );
  }
}
