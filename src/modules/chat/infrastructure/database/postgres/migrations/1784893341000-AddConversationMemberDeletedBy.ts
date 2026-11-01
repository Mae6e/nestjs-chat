import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationMemberDeletedBy1784893341000 implements MigrationInterface {
  name = 'AddConversationMemberDeletedBy1784893341000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ADD "deleted_by" character(24)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" DROP COLUMN "deleted_by"`,
    );
  }
}
