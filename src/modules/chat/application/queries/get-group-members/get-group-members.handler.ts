import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGroupMembersQuery } from './get-group-members.query';
import { Logger } from '@nestjs/common';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { ConversationMemberReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ConversationNotFoundException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@QueryHandler(GetGroupMembersQuery)
export class GetGroupMembersHandler implements IQueryHandler<
  GetGroupMembersQuery,
  ConversationMemberReadDto[]
> {
  private readonly logger = new Logger(GetGroupMembersHandler.name);

  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(
    query: GetGroupMembersQuery,
  ): Promise<ConversationMemberReadDto[]> {
    const { conversationId, userId } = query;

    const conversation = await this.queryRepo.getUserConversationById(
      conversationId,
      userId,
    );
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new NotAGroupConversationException(conversationId);
    }

    this.logger.debug(
      `Fetching active members of group ${conversationId} for user ${userId}`,
    );

    return this.queryRepo.getGroupMembers(
      conversationId,
      ConversationMemberStatus.ACTIVE,
    );
  }
}
