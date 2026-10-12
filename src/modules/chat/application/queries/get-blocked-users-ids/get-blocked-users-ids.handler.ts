import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBlockedUsersIdsQuery } from './get-blocked-users-ids.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';

@QueryHandler(GetBlockedUsersIdsQuery)
export class GetBlockedUsersIdsHandler implements IQueryHandler<
  GetBlockedUsersIdsQuery,
  string[]
> {
  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(query: GetBlockedUsersIdsQuery): Promise<string[]> {
    const res = await this.queryRepo.getBlockedUserIds(
      query.userId,
      query.targetUserIds,
    );
    return res;
  }
}
