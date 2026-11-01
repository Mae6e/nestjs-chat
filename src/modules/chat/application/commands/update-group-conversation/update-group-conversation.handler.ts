import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateGroupConversationCommand } from './update-group-conversation.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ChatDomainError,
  ConversationNotFoundException,
  GroupAdminRequiredException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(UpdateGroupConversationCommand)
export class UpdateGroupConversationHandler implements ICommandHandler<
  UpdateGroupConversationCommand,
  ConversationEntity
> {
  private readonly logger = new Logger(UpdateGroupConversationHandler.name);

  constructor(private readonly commandRepo: ConversationRepositoryPort) {}

  async execute(
    command: UpdateGroupConversationCommand,
  ): Promise<ConversationEntity> {
    const { conversationId, title, actorId, picture, description } = command;

    if (
      title === undefined &&
      picture === undefined &&
      description === undefined
    ) {
      throw new ChatDomainError('Nothing to update');
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

    conversation.updateInfo(title, picture, description, actorId);

    const saved = await this.commandRepo.saveConversation(conversation);

    this.logger.log(`Admin ${actorId} updated group ${conversationId} info`);

    return saved;
  }
}
