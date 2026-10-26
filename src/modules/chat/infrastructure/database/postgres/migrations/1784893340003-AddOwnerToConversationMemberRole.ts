import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerToConversationMemberRole1784893340003 implements MigrationInterface {
  name = 'AddOwnerToConversationMemberRole1784893340003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "chat"."conversation_members_role_enum" RENAME TO "conversation_members_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "chat"."conversation_members_role_enum" AS ENUM('USER', 'ADMIN', 'OWNER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" TYPE "chat"."conversation_members_role_enum" USING "role"::"text"::"chat"."conversation_members_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" SET DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `DROP TYPE "chat"."conversation_members_role_enum_old"`,
    );

    // Creator of the conversation becomes OWNER
    await queryRunner.query(
      `UPDATE "chat"."conversation_members" cm
       SET "role" = 'OWNER'
       FROM "chat"."conversations" c
       WHERE cm."conversation_id" = c."id"
         AND cm."user_id" = c."created_by"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "chat"."conversation_members" SET "role" = 'ADMIN' WHERE "role" = 'OWNER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "chat"."conversation_members_role_enum" RENAME TO "conversation_members_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "chat"."conversation_members_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" TYPE "chat"."conversation_members_role_enum" USING "role"::"text"::"chat"."conversation_members_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."conversation_members" ALTER COLUMN "role" SET DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `DROP TYPE "chat"."conversation_members_role_enum_old"`,
    );
  }
}
