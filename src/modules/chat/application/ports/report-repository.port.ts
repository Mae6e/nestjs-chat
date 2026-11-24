import { ReportEntity } from '@modules/chat/domain/models/report.model';
import {
  PaginatedResult,
  PaginationOptions,
} from '@common/pagination/pagination.interface';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';

export abstract class ReportRepositoryPort {
  abstract findPendingDirectReport(
    reporterId: string,
    reportedUserId: string,
    conversationId: string,
  ): Promise<ReportEntity | null>;

  abstract saveReport(report: ReportEntity): Promise<ReportEntity>;

  abstract getDirectReportList(
    pagination: PaginationOptions,
    status: ReportStatus,
  ): Promise<PaginatedResult<ReportEntity>>;

  abstract findDirectReportById(reportId: string): Promise<ReportEntity | null>;

  abstract getReportedConversationMessageList(
    conversationId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MessageReadDto>>;
}
