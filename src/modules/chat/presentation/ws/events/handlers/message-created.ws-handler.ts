import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MessageCreatedDomainEvent } from '@modules/chat/contracts/events';
import { ChatWsGateway } from '@modules/chat/presentation/ws/chat-ws.gateway';
import { Logger } from '@nestjs/common';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import {
  UserMessageCreated,
  UserMessageCreatedEvent,
} from '@modules/chat/presentation/ws/events/message-created.event';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';

@EventsHandler(MessageCreatedDomainEvent)
export class MessageCreatedWsEventHandler implements IEventHandler<MessageCreatedDomainEvent> {
  private readonly logger = new Logger(MessageCreatedWsEventHandler.name);

  constructor(
    private readonly chatWsGateway: ChatWsGateway,
    private readonly userIntegrationPort: UserIntegrationPort,
    private readonly commandRepo: ConversationRepositoryPort,
  ) {}

  async handle(event: MessageCreatedDomainEvent) {
    this.logger.debug(
      `Handling MessageCreatedDomainEvent for message ${event.messageId}`,
    );

    let conversation;
    try {
      conversation = await this.commandRepo.getConversationById(
        event.conversationId,
      );
    } catch {
      conversation = null;
    }

    if (!conversation) {
      this.logger.error(
        `Could not find conversation for message ${event.messageId}`,
      );
      return;
    }

    const senderMember = conversation.members.find(
      (m) => m.id === event.senderId,
    );
    if (!senderMember) {
      this.logger.error(
        `Sender member ${event.senderId} not found in conversation ${event.conversationId}`,
      );
      return;
    }

    const senderUserId = senderMember.userId;

    // Direct conversations shadow blocked messages for the blocked user. Group
    // conversations deliver to every active member.
    const recipients = conversation
      .getActiveMembers()
      .filter(
        (member) =>
          member.userId !== senderUserId &&
          !event.deletedForUserIds.includes(member.userId),
      );

    if (recipients.length === 0) {
      return;
    }

    const isGroup = conversation.type === ConversationType.GROUP;

    // Direct conversations use per-user rooms. Groups additionally fan out
    // through a single conversation room, but keep the recipients' personal
    // rooms as a fallback: a group creator is not in the conversation room
    // until their socket reconnects, and room membership can lag behind the
    // database after a join. Socket.IO de-duplicates sockets across rooms, so
    // each client still receives the message exactly once.
    const rooms = recipients.map((member) => `user-${member.userId}`);
    if (isGroup) {
      rooms.push(`conversation-${conversation.id}`);
    }

    // The sender already received the message through the send acknowledgement,
    // so keep excluding all of their devices from this broadcast.
    const exceptRooms = isGroup
      ? [
          `user-${senderUserId}`,
          ...event.deletedForUserIds.map((userId) => `user-${userId}`),
        ]
      : [];

    try {
      const users = await this.userIntegrationPort.getUsersByIds([
        senderUserId,
      ]);
      const currentUser = users.find((user) => user.id === senderUserId);

      if (!currentUser) {
        this.logger.error(`Could not fetch sender ${senderUserId}`);
        return;
      }

      await this.chatWsGateway.serverBroadcast<UserMessageCreated>(
        this.chatWsGateway.server,
        rooms,
        new UserMessageCreatedEvent({
          id: event.messageId,
          seen: false,
          createdAt: event.createdAt.toISOString(),
          user: {
            id: currentUser.id,
            username: currentUser.username,
            avatarIndex: currentUser.avatarIndex,
            avatar: currentUser.avatar,
          },
          content: event.text,
          conversation: {
            id: conversation.id,
          },
        }),
        exceptRooms,
      );
    } catch {
      this.logger.error(`Could not fetch users for message broadcast`);
    }
  }
}
