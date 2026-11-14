export interface ChatUser {
  id: string;
  username: string;
  avatarIndex: number;
  avatar?: string;
  isDmEnabled: boolean;
  pawnId?: number;
  netWorth?: number;
}

export interface BlockStatus {
  isBlocker: boolean;
  isBlocked: boolean;
}

export interface ChatFriend {
  id: string;
  username: string;
  avatarIndex: number;
  avatar?: string;
}

export interface GetFriendsOptions {
  /**
   * When set, only friends whose `isDmEnabled` matches the value are
   * returned by the platform.
   */
  userIds?: string[];
  isDmEnabled?: boolean;
}

export abstract class UserIntegrationPort {
  abstract doesUserExist(userId: string): Promise<boolean>;
  abstract hasBlockRelation(userA: string, userB: string): Promise<boolean>;
  abstract getUserById(userId: string): Promise<ChatUser>;
  abstract getUsersByIds(userIds: string[]): Promise<ChatUser[]>;
  // abstract getFriends(
  //   userId: string,
  //   options?: GetFriendsOptions,
  // ): Promise<ChatFriend[]>;
  abstract getUserIdsByNameOrUsername(filter: string): Promise<string[]>;
  abstract getBlockedUsersIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<string[]>;
  abstract getBlockStatus(
    userId: string,
    targetUserId: string,
  ): Promise<BlockStatus>;

  abstract setHasConversation(userId: string, friendId: string): Promise<void>;
}
