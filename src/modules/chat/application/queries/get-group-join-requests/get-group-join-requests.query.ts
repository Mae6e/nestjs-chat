import { PaginationOptions } from '@common/pagination/pagination.interface';

export class GetGroupJoinRequestsQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly pagination: PaginationOptions,
  ) {}
}
