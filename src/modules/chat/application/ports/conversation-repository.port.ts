import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { MessageEntity } from '@modules/chat/domain/models/message.model';

export abstract class ConversationRepositoryPort {
  abstract getConversationById(id: string): Promise<ConversationEntity | null>;
  abstract saveConversation(
    conversation: ConversationEntity,
  ): Promise<ConversationEntity>;
  abstract saveMessage(message: MessageEntity): Promise<MessageEntity>;
  abstract deleteConversation(id: string): Promise<boolean>;

  /**
   * Loads a single membership, including soft-deleted rows, so that a user can
   * re-request / be re-added to a group they previously left or were removed
   * from (the (conversation_id, user_id) pair is unique).
   */
  abstract getMembership(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity | null>;

  abstract countMembers(conversationId: string): Promise<number>;

  abstract saveMember(
    member: ConversationMemberEntity,
  ): Promise<ConversationMemberEntity>;

  abstract softDeleteMember(
    conversationId: string,
    userId: string,
  ): Promise<boolean>;
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
