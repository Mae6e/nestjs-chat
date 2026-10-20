import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserGroupConversationListQuery } from './get-user-group-conversation-list.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { GroupConversationListItemReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { PaginatedResult } from '@common/pagination/pagination.interface';

@QueryHandler(GetUserGroupConversationListQuery)
export class GetUserGroupConversationListHandler implements IQueryHandler<
  GetUserGroupConversationListQuery,
  PaginatedResult<GroupConversationListItemReadDto>
> {
  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(
    query: GetUserGroupConversationListQuery,
  ): Promise<PaginatedResult<GroupConversationListItemReadDto>> {
    return this.queryRepo.getUserGroupConversationList(
      query.userId,
      query.pagination,
    );
  }
}
