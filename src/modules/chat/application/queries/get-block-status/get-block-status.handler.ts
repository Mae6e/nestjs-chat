import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBlockStatusQuery } from './get-block-status.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { GetBlockStatusResponse } from './get-block-status.response';

@QueryHandler(GetBlockStatusQuery)
export class GetBlockStatusHandler implements IQueryHandler<
  GetBlockStatusQuery,
  GetBlockStatusResponse
> {
  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(query: GetBlockStatusQuery): Promise<GetBlockStatusResponse> {
    const [isBlockerRes, isBlockedRes] = await Promise.all([
      this.queryRepo.getBlockStatus(query.userId, query.targetUserId),
      this.queryRepo.getBlockStatus(query.targetUserId, query.userId),
    ]);

    return {
      isBlocker: isBlockerRes,
      isBlocked: isBlockedRes,
    };
  }
}
