import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGroupMembersQuery } from './get-group-members.query';
import { Logger } from '@nestjs/common';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { ConversationMemberReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

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
    const { conversationId } = query;

    this.logger.debug(`Fetching active members of group ${conversationId}`);

    return this.queryRepo.getGroupMembers(
      conversationId,
      ConversationMemberStatus.ACTIVE,
    );
  }
}
