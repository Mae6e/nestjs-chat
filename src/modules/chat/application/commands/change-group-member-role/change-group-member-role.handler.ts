import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangeGroupMemberRoleCommand } from './change-group-member-role.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import {
  ChatDomainError,
  ConversationNotFoundException,
  GroupAdminRequiredException,
  GroupMemberCannotChangeOwnRoleException,
  GroupMemberNotFoundException,
  GroupMemberRoleUnchangedException,
  GroupOwnerRoleCannotBeChangedException,
  LastGroupAdminException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(ChangeGroupMemberRoleCommand)
export class ChangeGroupMemberRoleHandler implements ICommandHandler<
  ChangeGroupMemberRoleCommand,
  ConversationMemberEntity
> {
  private readonly logger = new Logger(ChangeGroupMemberRoleHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(
    command: ChangeGroupMemberRoleCommand,
  ): Promise<ConversationMemberEntity> {
    const { conversationId, actorId, targetUserId, role } = command;

    if (
      ![ConversationMemberRole.USER, ConversationMemberRole.ADMIN].includes(
        role,
      )
    ) {
      throw new ChatDomainError(`Unsupported member role: ${role}`);
    }

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

    if (target.role === ConversationMemberRole.OWNER) {
      throw new GroupOwnerRoleCannotBeChangedException();
    }

    if (target.role === role) {
      throw new GroupMemberRoleUnchangedException();
    }

    if (targetUserId === actorId) {
      throw new GroupMemberCannotChangeOwnRoleException();
    }

    if (
      [(ConversationMemberRole.OWNER, ConversationMemberRole.ADMIN)].includes(
        target.role,
      ) &&
      role === ConversationMemberRole.USER &&
      conversation.getAdmins().length <= 1
    ) {
      throw new LastGroupAdminException(targetUserId);
    }

    target.changeRole(role, actorId);

    const saved = await this.commandRepo.saveMember(target);

    this.logger.log(
      `Admin ${actorId} changed role of ${targetUserId} to ${role} in group ${conversationId}`,
    );

    return saved;
  }
}
