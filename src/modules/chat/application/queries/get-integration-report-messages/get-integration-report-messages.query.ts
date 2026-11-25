import { PaginationOptions } from '@common/pagination/pagination.interface';

export class GetIntegrationReportMessagesQuery {
  constructor(
    public readonly reportId: string,
    public readonly pagination: PaginationOptions,
  ) {}
}
