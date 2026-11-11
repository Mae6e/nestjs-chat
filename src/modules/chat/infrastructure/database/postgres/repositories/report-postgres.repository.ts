import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { Report } from '@modules/chat/infrastructure/database/postgres/entities/report.entity';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';

@Injectable()
export class ReportPostgresRepository implements ReportRepositoryPort {
  constructor(
    @InjectDataSource(DatabaseType.POSTGRES)
    private readonly dataSource: DataSource,
  ) {}

  async findPendingDirectReport(
    reporterId: string,
    reportedUserId: string,
    conversationId: string,
  ): Promise<ReportEntity | null> {
    const report = await this.dataSource.getRepository(Report).findOne({
      where: {
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        conversation_id: conversationId,
        type: ReportType.DIRECT_USER,
        status: ReportStatus.PENDING,
      },
    });

    return report ? Report.toDomain(report) : null;
  }

  async saveReport(reportEntity: ReportEntity): Promise<ReportEntity> {
    const report = Report.fromDomain(reportEntity);
    const saved = await this.dataSource.getRepository(Report).save(report);

    return Report.toDomain(saved);
  }
}
