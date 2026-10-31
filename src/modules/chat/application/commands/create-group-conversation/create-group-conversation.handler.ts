import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { CreateGroupConversationCommand } from './create-group-conversation.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import {
  ChatDomainError,
  UserAlreadyInGroupException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(CreateGroupConversationCommand)
export class CreateGroupConversationHandler implements ICommandHandler<
  CreateGroupConversationCommand,
  ConversationEntity
> {
  private readonly logger = new Logger(CreateGroupConversationHandler.name);

  constructor(
    private readonly commandRepo: ConversationRepositoryPort,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: CreateGroupConversationCommand,
  ): Promise<ConversationEntity> {
    const { creatorId, picture, description } = command;

    const trimmedTitle = command.title?.trim();
    if (!trimmedTitle) {
      throw new ChatDomainError('Group title is required');
    }
    if (trimmedTitle.length > 50) {
      throw new ChatDomainError(
        'Group title must be at most 50 characters long',
      );
    }

    // A user may belong to only one group at a time.
    const alreadyInGroup =
      await this.commandRepo.hasActiveGroupMembership(creatorId);
    if (alreadyInGroup) {
      throw new UserAlreadyInGroupException(creatorId);
    }

    this.logger.debug(
      `Creating group "${trimmedTitle}" for creator ${creatorId}`,
    );

    // Only the creator is a member at creation time. Other users join through
    // the join-request flow so admins can approve them.
    const conversation = ConversationEntity.createGroup(
      creatorId,
      trimmedTitle,
      [],
      picture ?? null,
      description ?? null,
    );

    const savedConversation =
      await this.commandRepo.saveConversation(conversation);

    // Creating a group makes this the creator's only group, so drop any
    // pending join request they may have in other groups.
    await this.commandRepo.deletePendingMembershipsForUser(
      creatorId,
      savedConversation.id,
      creatorId,
    );

    const conversationRoot =
      this.publisher.mergeObjectContext(savedConversation);
    conversationRoot.commit();

    this.logger.log(`Created group conversation: ${conversationRoot.id}`);

    return conversationRoot;
  }
}
