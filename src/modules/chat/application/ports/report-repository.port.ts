import { ReportEntity } from '@modules/chat/domain/models/report.model';

export abstract class ReportRepositoryPort {
  abstract findPendingDirectReport(
    reporterId: string,
    reportedUserId: string,
    conversationId: string,
  ): Promise<ReportEntity | null>;

  abstract saveReport(report: ReportEntity): Promise<ReportEntity>;
}
