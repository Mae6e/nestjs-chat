import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { GetDirectMessageUserIdsQuery } from './get-direct-message-user-ids.query';

@QueryHandler(GetDirectMessageUserIdsQuery)
export class GetDirectMessageUserIdsHandler implements IQueryHandler<
  GetDirectMessageUserIdsQuery,
  string[]
> {
  private readonly logger = new Logger(GetDirectMessageUserIdsHandler.name);

  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(query: GetDirectMessageUserIdsQuery): Promise<string[]> {
    this.logger.debug(
      `Fetching direct message user IDs for user ${query.userId}`,
    );

    return this.queryRepo.getDirectMessageUserIds(query.userId);
  }
}
