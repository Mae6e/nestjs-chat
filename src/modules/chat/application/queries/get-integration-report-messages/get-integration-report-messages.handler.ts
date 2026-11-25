import { PaginatedResult } from '@common/pagination/pagination.interface';
import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import {
  ReportConversationNotFoundException,
  ReportNotFoundException,
} from '@modules/chat/domain/chat.exceptions';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetIntegrationReportMessagesQuery } from './get-integration-report-messages.query';

@QueryHandler(GetIntegrationReportMessagesQuery)
export class GetIntegrationReportMessagesHandler implements IQueryHandler<
  GetIntegrationReportMessagesQuery,
  PaginatedResult<MessageReadDto>
> {
  constructor(private readonly reportRepository: ReportRepositoryPort) {}

  async execute(
    query: GetIntegrationReportMessagesQuery,
  ): Promise<PaginatedResult<MessageReadDto>> {
    const report = await this.reportRepository.findDirectReportById(
      query.reportId,
    );

    if (!report) {
      throw new ReportNotFoundException(query.reportId);
    }

    if (!report.conversationId) {
      throw new ReportConversationNotFoundException(query.reportId);
    }

    return this.reportRepository.getReportedConversationMessageList(
      report.conversationId,
      query.pagination,
    );
  }
}
