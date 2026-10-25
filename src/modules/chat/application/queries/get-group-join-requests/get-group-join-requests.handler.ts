import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGroupJoinRequestsQuery } from './get-group-join-requests.query';
import { Logger } from '@nestjs/common';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { ConversationMemberReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { PaginatedResult } from '@common/pagination/pagination.interface';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ConversationNotFoundException,
  GroupAdminRequiredException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@QueryHandler(GetGroupJoinRequestsQuery)
export class GetGroupJoinRequestsHandler implements IQueryHandler<
  GetGroupJoinRequestsQuery,
  PaginatedResult<ConversationMemberReadDto>
> {
  private readonly logger = new Logger(GetGroupJoinRequestsHandler.name);

  constructor(private readonly queryRepo: ConversationReadRepositoryPort) {}

  async execute(
    query: GetGroupJoinRequestsQuery,
  ): Promise<PaginatedResult<ConversationMemberReadDto>> {
    const { conversationId, userId, pagination } = query;

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

    const currentMember = conversation.members.find(
      (member) =>
        member.userId === userId &&
        member.status === ConversationMemberStatus.ACTIVE,
    );
    if (currentMember?.role !== ConversationMemberRole.ADMIN) {
      throw new GroupAdminRequiredException(userId);
    }

    this.logger.debug(
      `Fetching pending join requests of group ${conversationId} for admin ${userId}`,
    );

    return this.queryRepo.getGroupJoinRequests(conversationId, pagination);
  }
}
