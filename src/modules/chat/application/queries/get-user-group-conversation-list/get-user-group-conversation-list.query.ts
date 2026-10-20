import { PaginationOptions } from '@common/pagination/pagination.interface';

export class GetUserGroupConversationListQuery {
  constructor(
    public readonly userId: string,
    public readonly pagination: PaginationOptions,
  ) {}
}
