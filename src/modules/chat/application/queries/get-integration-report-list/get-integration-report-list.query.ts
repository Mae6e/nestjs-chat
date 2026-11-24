import { PaginationOptions } from '@common/pagination/pagination.interface';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';

export class GetIntegrationReportListQuery {
  constructor(
    public readonly pagination: PaginationOptions,
    public readonly status: ReportStatus,
  ) {}
}
