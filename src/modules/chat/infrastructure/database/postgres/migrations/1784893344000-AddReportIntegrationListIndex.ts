import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportIntegrationListIndex1784893344000 implements MigrationInterface {
  name = 'AddReportIntegrationListIndex1784893344000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "reports_type_status_created_at_id_idx" ON "chat"."reports" ("type", "status", "created_at" DESC, "id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "chat"."reports_type_status_created_at_id_idx"`,
    );
  }
}
