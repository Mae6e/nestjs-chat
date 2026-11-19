import { GetUserConversationIdsOptions } from '@modules/chat/application/ports/options/get-user-conversation-ids.options';
import { GetUserConversationListOptions } from '@modules/chat/application/ports/options/get-user-conversation-list.options';
import {
  PaginatedResult,
  PaginationOptions,
} from '@common/pagination/pagination.interface';
import {
  ConversationMemberReadDto,
  ConversationReadDto,
  GroupConversationListItemReadDto,
} from '@modules/chat/application/dtos/conversation-read.dto';
import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

export abstract class ConversationReadRepositoryPort {
  abstract getUserConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationReadDto | null>;

  abstract conversationExists(
    userId: string,
    targetUserId: string,
  ): Promise<boolean>;

  abstract getUserConversationList(
    userId: string,
    options: GetUserConversationListOptions,
  ): Promise<PaginatedResult<ConversationReadDto>>;

  /**
   * Returns `true` when the user has at least one unread message in any of
   * their active conversations. Uses an `EXISTS` query so it stops at the
   * first unread row.
   */
  abstract hasUnreadMessages(userId: string): Promise<boolean>;

  abstract getUserGroupConversationList(
    userId: string,
    pagination: PaginationOptions,
    search?: string,
    joinedOnly?: boolean,
  ): Promise<PaginatedResult<GroupConversationListItemReadDto>>;

  abstract getUserConversationIds(
    userId: string,
    options: GetUserConversationIdsOptions,
  ): Promise<string[]>;

  /**
   * Returns the IDs of every other user the given user has a direct
   * conversation with. Blocked users are included.
   */
  abstract getDirectMessageUserIds(userId: string): Promise<string[]>;

  abstract getUserConversationMessageList(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MessageReadDto>>;

  abstract getGroupMembers(
    conversationId: string,
    status?: ConversationMemberStatus,
  ): Promise<ConversationMemberReadDto[]>;

  abstract getGroupJoinRequests(
    conversationId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<ConversationMemberReadDto>>;

  abstract getBlockStatus(
    userId: string,
    targetUserId: string,
  ): Promise<boolean>;

  abstract getBlockedUserIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<string[]>;
}
