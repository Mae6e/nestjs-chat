import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  GroupJoinRequestAction,
  RespondToJoinRequestCommand,
} from './respond-to-join-request.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ConversationNotFoundException,
  GroupAdminRequiredException,
  GroupJoinRequestNotFoundException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(RespondToJoinRequestCommand)
export class RespondToJoinRequestHandler implements ICommandHandler<
  RespondToJoinRequestCommand,
  ConversationMemberEntity
> {
  private readonly logger = new Logger(RespondToJoinRequestHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(
    command: RespondToJoinRequestCommand,
  ): Promise<ConversationMemberEntity> {
    const { conversationId, actorId, targetUserId, action } = command;

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
    if (!target?.isPending()) {
      throw new GroupJoinRequestNotFoundException(targetUserId);
    }

    if (action === GroupJoinRequestAction.APPROVE) {
      target.approve();
    } else {
      target.reject();
    }

    const saved = await this.commandRepo.saveMember(target);

    this.logger.log(
      `Admin ${actorId} ${action.toLowerCase()}d join request of ${targetUserId} for group ${conversationId}`,
    );

    return saved;
  }
}
