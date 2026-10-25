import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RequestJoinGroupCommand } from './request-join-group.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { MAX_GROUP_MEMBERS } from '@modules/chat/domain/constants/group.constants';
import {
  ConversationNotFoundException,
  GroupMemberAlreadyExistsException,
  GroupMemberLimitExceededException,
  GroupMemberRequestPendingException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(RequestJoinGroupCommand)
export class RequestJoinGroupHandler implements ICommandHandler<
  RequestJoinGroupCommand,
  ConversationMemberEntity
> {
  private readonly logger = new Logger(RequestJoinGroupHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(
    command: RequestJoinGroupCommand,
  ): Promise<ConversationMemberEntity> {
    const { conversationId, userId } = command;

    const conversation =
      await this.commandRepo.getConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new NotAGroupConversationException(conversationId);
    }

    const existing = conversation.getMember(userId);
    if (existing?.isActive()) {
      throw new GroupMemberAlreadyExistsException(userId);
    }

    if (existing?.isPending()) {
      throw new GroupMemberRequestPendingException(userId);
    }

    const membersCount = await this.commandRepo.countMembers(conversationId);
    if (membersCount >= MAX_GROUP_MEMBERS) {
      throw new GroupMemberLimitExceededException(
        `maximum of ${MAX_GROUP_MEMBERS} members reached`,
      );
    }

    let member =
      existing ??
      (await this.commandRepo.getMembership(conversationId, userId));

    if (member) {
      member.requestToJoin();
      // A join request never carries privileges: even a previously removed
      // admin rejoins as a regular USER until an admin promotes them.
      member.changeRole(ConversationMemberRole.USER);
    } else {
      member = ConversationMemberEntity.create(
        userId,
        conversationId,
        ConversationMemberRole.USER,
        ConversationMemberStatus.PENDING,
      );
    }

    const saved = await this.commandRepo.saveMember(member);

    this.logger.log(`User ${userId} requested to join group ${conversationId}`);

    return saved;
  }
}
