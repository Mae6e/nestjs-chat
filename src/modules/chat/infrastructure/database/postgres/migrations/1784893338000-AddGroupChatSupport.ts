import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupChatSupport1784893338000 implements MigrationInterface {
  name = 'AddGroupChatSupport1784893338000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make sure the GROUP conversation type exists even if the initial
    // migration was created before it was introduced.
    await queryRunner.query(
      `ALTER TYPE "chat"."conversations_type_enum" ADD VALUE IF NOT EXISTS 'GROUP'`,
    );

    await queryRunner.query(
      `CREATE TYPE "chat"."conversation_members_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "chat"."conversation_members_status_enum" AS ENUM('PENDING', 'ACTIVE', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ADD "role" "chat"."conversation_members_role_enum" NOT NULL DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ADD "status" "chat"."conversation_members_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `CREATE INDEX "conversation_members_status_idx" ON "chat"."conversation_members" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "chat"."conversation_members_status_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" DROP COLUMN "role"`,
    );
    await queryRunner.query(
      `DROP TYPE "chat"."conversation_members_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "chat"."conversation_members_role_enum"`,
    );
  }
}
