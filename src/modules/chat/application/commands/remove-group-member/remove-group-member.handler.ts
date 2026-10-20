import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveGroupMemberCommand } from './remove-group-member.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import {
  ConversationNotFoundException,
  GroupAdminRequiredException,
  GroupMemberNotFoundException,
  LastGroupAdminException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(RemoveGroupMemberCommand)
export class RemoveGroupMemberHandler implements ICommandHandler<
  RemoveGroupMemberCommand,
  boolean
> {
  private readonly logger = new Logger(RemoveGroupMemberHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(command: RemoveGroupMemberCommand): Promise<boolean> {
    const { conversationId, actorId, targetUserId } = command;

    const conversation =
      await this.commandRepo.getConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new NotAGroupConversationException(conversationId);
    }

    const actor = conversation.getMember(actorId);
    if (!actor?.isAdmin()) {
      throw new GroupAdminRequiredException(actorId);
    }

    const target = conversation.getMember(targetUserId);
    if (!target?.isActive()) {
      throw new GroupMemberNotFoundException(targetUserId);
    }

    const activeAdmins = conversation
      .getActiveMembers()
      .filter((m) => m.role === ConversationMemberRole.ADMIN);

    if (
      target.role === ConversationMemberRole.ADMIN &&
      activeAdmins.length <= 1
    ) {
      throw new LastGroupAdminException(targetUserId);
    }

    const removed = await this.commandRepo.softDeleteMember(
      conversationId,
      targetUserId,
    );

    this.logger.log(
      `Admin ${actorId} removed member ${targetUserId} from group ${conversationId}`,
    );

    return removed;
  }
}
