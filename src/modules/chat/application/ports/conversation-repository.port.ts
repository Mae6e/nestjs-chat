import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { MessageEntity } from '@modules/chat/domain/models/message.model';

export abstract class ConversationRepositoryPort {
  abstract getConversationById(id: string): Promise<ConversationEntity | null>;
  abstract saveConversation(
    conversation: ConversationEntity,
  ): Promise<ConversationEntity>;
  abstract saveMessage(message: MessageEntity): Promise<MessageEntity>;
  abstract deleteConversation(id: string): Promise<boolean>;
  abstract getBlockStatus(
    blockerId: string,
    blockedId: string,
  ): Promise<boolean>;
  abstract getBlockedUserIds(
    blockerId: string,
    blockedIds?: string[],
  ): Promise<string[]>;
  abstract block(blockerId: string, blockedId: string): Promise<boolean>;
  abstract unblock(blockerId: string, blockedId: string): Promise<boolean>;
}
