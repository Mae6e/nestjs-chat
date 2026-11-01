import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationDescription1784893340001 implements MigrationInterface {
  name = 'AddConversationDescription1784893340001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" ADD "description" character(1000)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversations" DROP COLUMN "description"`,
    );
  }
}
