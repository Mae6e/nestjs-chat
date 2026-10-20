import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LeaveGroupCommand } from './leave-group.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ConversationNotFoundException,
  GroupMemberNotFoundException,
  LastGroupAdminException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(LeaveGroupCommand)
export class LeaveGroupHandler implements ICommandHandler<
  LeaveGroupCommand,
  boolean
> {
  private readonly logger = new Logger(LeaveGroupHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(command: LeaveGroupCommand): Promise<boolean> {
    const { conversationId, userId } = command;

    const conversation =
      await this.commandRepo.getConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new NotAGroupConversationException(conversationId);
    }

    const member = conversation.getMember(userId);
    if (!member?.isActive()) {
      throw new GroupMemberNotFoundException(userId);
    }

    if (member.isAdmin() && conversation.getAdmins().length <= 1) {
      throw new LastGroupAdminException(userId);
    }

    const removed = await this.commandRepo.softDeleteMember(
      conversationId,
      userId,
    );

    this.logger.log(`User ${userId} left group ${conversationId}`);

    return removed;
  }
}
