import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { HasUnreadMessagesQuery } from './has-unread-messages.query';

@QueryHandler(HasUnreadMessagesQuery)
export class HasUnreadMessagesHandler implements IQueryHandler<
  HasUnreadMessagesQuery,
  boolean
> {
  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(query: HasUnreadMessagesQuery): Promise<boolean> {
    return this.queryRepo.hasUnreadMessages(query.userId);
  }
}
