import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LeaveGroupCommand, LeaveGroupResult } from './leave-group.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import {
  ConversationNotFoundException,
  GroupMemberNotFoundException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(LeaveGroupCommand)
export class LeaveGroupHandler implements ICommandHandler<
  LeaveGroupCommand,
  LeaveGroupResult
> {
  private readonly logger = new Logger(LeaveGroupHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(command: LeaveGroupCommand): Promise<LeaveGroupResult> {
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

    const remainingMembers = conversation
      .getActiveMembers()
      .filter((m) => m.userId !== userId);

    // The last member left, so the group has nobody left in it: delete it.
    if (remainingMembers.length === 0) {
      const deleted = await this.commandRepo.deleteConversation(conversationId);

      this.logger.log(
        `User ${userId} left group ${conversationId}; group deleted because it has no remaining members`,
      );
      return new LeaveGroupResult(deleted, undefined, true);
    }

    let promotedAdminId: string | undefined;

    // If the last admin leaves, hand the admin role over to the oldest active
    // member (by createdAt) so the group is never left without an admin.
    if (member.isAdmin()) {
      const hasOtherAdmin = remainingMembers.some((m) => m.isAdmin());

      if (!hasOtherAdmin) {
        const nextAdmin = remainingMembers.sort(
          (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime() ||
            a.id.localeCompare(b.id),
        )[0];

        if (nextAdmin) {
          nextAdmin.changeRole(ConversationMemberRole.ADMIN);
          await this.commandRepo.saveMember(nextAdmin);
          promotedAdminId = nextAdmin.userId;
          this.logger.log(
            `User ${nextAdmin.userId} promoted to admin of group ${conversationId} after last admin ${userId} left`,
          );
        }
      }
    }

    const removed = await this.commandRepo.softDeleteMember(
      conversationId,
      userId,
      userId,
    );

    this.logger.log(`User ${userId} left group ${conversationId}`);
    return new LeaveGroupResult(removed, promotedAdminId);
  }
}
