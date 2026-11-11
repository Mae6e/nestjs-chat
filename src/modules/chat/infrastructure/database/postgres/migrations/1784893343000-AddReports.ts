import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReports1784893343000 implements MigrationInterface {
  name = 'AddReports1784893343000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "chat"."reports_type_enum" AS ENUM('DIRECT_USER', 'GROUP_MESSAGE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "chat"."reports_status_enum" AS ENUM('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat"."reports" ("id" uuid NOT NULL, "type" "chat"."reports_type_enum" NOT NULL, "reporter_id" char(24) NOT NULL, "reported_user_id" char(24), "conversation_id" uuid, "message_id" uuid, "reason" character varying(100), "description" text, "status" "chat"."reports_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz, CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "reports_reporter_id_idx" ON "chat"."reports" ("reporter_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "reports_reported_user_id_idx" ON "chat"."reports" ("reported_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "reports_conversation_id_idx" ON "chat"."reports" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "reports_message_id_idx" ON "chat"."reports" ("message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "reports_status_idx" ON "chat"."reports" ("status")`,
    );

    // A user cannot submit more than one open report for the same user in the
    // same direct conversation.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "reports_pending_direct_uniq" ON "chat"."reports" ("reporter_id", "reported_user_id", "conversation_id") WHERE "type" = 'DIRECT_USER' AND "status" = 'PENDING' AND "deleted_at" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "chat"."reports" ADD CONSTRAINT "reports_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."reports" ADD CONSTRAINT "reports_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "chat"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat"."reports" DROP CONSTRAINT "reports_message_id_fk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat"."reports" DROP CONSTRAINT "reports_conversation_id_fk"`,
    );
    await queryRunner.query(`DROP INDEX "chat"."reports_pending_direct_uniq"`);
    await queryRunner.query(`DROP INDEX "chat"."reports_status_idx"`);
    await queryRunner.query(`DROP INDEX "chat"."reports_message_id_idx"`);
    await queryRunner.query(`DROP INDEX "chat"."reports_conversation_id_idx"`);
    await queryRunner.query(`DROP INDEX "chat"."reports_reported_user_id_idx"`);
    await queryRunner.query(`DROP INDEX "chat"."reports_reporter_id_idx"`);
    await queryRunner.query(`DROP TABLE "chat"."reports"`);
    await queryRunner.query(`DROP TYPE "chat"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "chat"."reports_type_enum"`);
  }
}
