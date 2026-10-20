import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddGroupMembersCommand } from './add-group-members.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ChatDomainError,
  ConversationNotFoundException,
  GroupAdminRequiredException,
  NotAGroupConversationException,
  TargetUserNotFoundException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(AddGroupMembersCommand)
export class AddGroupMembersHandler implements ICommandHandler<
  AddGroupMembersCommand,
  ConversationMemberEntity[]
> {
  private readonly logger = new Logger(AddGroupMembersHandler.name);

  constructor(
    private readonly commandRepo: ConversationRepositoryPort,
    private readonly userIntegrationPort: UserIntegrationPort,
  ) {}

  async execute(
    command: AddGroupMembersCommand,
  ): Promise<ConversationMemberEntity[]> {
    const { conversationId, actorId } = command;

    const userIds = Array.from(
      new Set(command.userIds.filter((id) => id && id !== actorId)),
    );

    if (userIds.length === 0) {
      throw new ChatDomainError('No members to add');
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

    const users = await this.userIntegrationPort.getUsersByIds(userIds);
    const foundIds = new Set(users.map((u) => u.id));
    const missing = userIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new TargetUserNotFoundException(missing.join(', '));
    }

    const added: ConversationMemberEntity[] = [];

    for (const userId of userIds) {
      const existing = conversation.getMember(userId);
      if (existing?.isActive()) {
        continue;
      }

      let member =
        existing ??
        (await this.commandRepo.getMembership(conversationId, userId));

      if (member) {
        member.activate();
        member.changeRole(ConversationMemberRole.USER);
      } else {
        member = ConversationMemberEntity.create(
          userId,
          conversationId,
          ConversationMemberRole.USER,
          ConversationMemberStatus.ACTIVE,
        );
      }

      added.push(await this.commandRepo.saveMember(member));
    }

    this.logger.log(
      `Admin ${actorId} added ${added.length} member(s) to group ${conversationId}`,
    );

    return added;
  }
}
