import { PaginatedResult } from '@common/pagination/pagination.interface';
import { ReportIntegrationReadDto } from '@modules/chat/application/dtos/report-integration-read.dto';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetIntegrationReportListQuery } from './get-integration-report-list.query';

@QueryHandler(GetIntegrationReportListQuery)
export class GetIntegrationReportListHandler implements IQueryHandler<
  GetIntegrationReportListQuery,
  PaginatedResult<ReportIntegrationReadDto>
> {
  constructor(private readonly reportRepository: ReportRepositoryPort) {}

  async execute(
    query: GetIntegrationReportListQuery,
  ): Promise<PaginatedResult<ReportIntegrationReadDto>> {
    const result = await this.reportRepository.getDirectReportList(
      query.pagination,
      query.status,
    );

    return {
      data: result.data.map((report) => ({
        id: report.id,
        type: report.type,
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        conversationId: report.conversationId,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      })),
      meta: result.meta,
    };
  }
}
