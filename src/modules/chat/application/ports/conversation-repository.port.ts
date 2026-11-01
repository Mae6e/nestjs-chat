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

  /**
   * True when the user is an active member of any group conversation.
   * A user may belong to only one group at a time.
   */
  abstract hasActiveGroupMembership(
    userId: string,
    exceptConversationId?: string,
  ): Promise<boolean>;

  /**
   * Soft-deletes every pending join request of the user, optionally keeping
   * the request for one conversation (the one just approved).
   */
  abstract deletePendingMembershipsForUser(
    userId: string,
    exceptConversationId?: string,
    deletedBy?: string | null,
  ): Promise<number>;

  abstract saveMember(
    member: ConversationMemberEntity,
  ): Promise<ConversationMemberEntity>;

  abstract softDeleteMember(
    conversationId: string,
    userId: string,
    deletedBy?: string | null,
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
