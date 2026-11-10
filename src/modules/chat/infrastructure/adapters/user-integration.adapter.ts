import { Injectable } from '@nestjs/common';
import {
  BlockStatus,
  ChatFriend,
  ChatUser,
  GetFriendsOptions,
  UserIntegrationPort,
} from '@modules/chat/application/ports/user-integration.port';
import { QueryBus } from '@nestjs/cqrs';
import { GetBlockStatusQuery } from '@modules/chat/application/queries/get-block-status/get-block-status.query';
import { GetBlockedUsersIdsQuery } from '@modules/chat/application/queries/get-blocked-users-ids/get-blocked-users-ids.query';
import { PlatformApiClient } from '@infrastructure/platform-api/platform-api.client';

interface PlatformFriend {
  userId?: string;
  friendId?: string;
  userName?: string;
  name?: string;
  userAvatar?: string | null;
  userIndexAvatar?: number;
  isDmEnabled?: boolean;
}

@Injectable()
export class UserIntegrationAdapter implements UserIntegrationPort {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly client: PlatformApiClient,
  ) {}

  async doesUserExist(id: string): Promise<boolean> {
    const response: { data: boolean } = await this.client.get(`${id}/exists`);
    return response.data;
  }

  async getUserById(id: string): Promise<ChatUser | null> {
    const response: { data: any } = await this.client.get(`${id}`);
    return response.data;
  }

  async getUserIdsByNameOrUsername(): Promise<any | null> {
    return null;
  }

  async getUsersByIds(userIds: string[]): Promise<ChatUser[]> {
    const response: { data: any[] } = await this.client.post(`batch`, {
      ids: userIds,
    });
    return response.data;
  }

  // async getFriends(
  //   userId: string,
  //   options: GetFriendsOptions = {},
  // ): Promise<ChatFriend[]> {
  //   const body: Record<string, unknown> = {};
  //   if (options.isDmEnabled !== undefined) {
  //     body.isDmEnabled = options.isDmEnabled;
  //   }
  //   if (options.userIds) {
  //     body.userIds = options.userIds;
  //   }

  //   const response = await this.client.post<{ data?: PlatformFriend[] }>(
  //     `${userId}/friends/search`,
  //     body,
  //   );

  //   return (response.data ?? []).map((friend) => ({
  //     id: friend.userId ?? friend.friendId,
  //     username: friend.userName ?? friend.name,
  //     avatarIndex: friend.userIndexAvatar ?? 0,
  //     avatar: friend.userAvatar ?? undefined,
  //   }));
  // }

  async hasBlockRelation(userA: string, userB: string): Promise<boolean> {
    const res = await this.queryBus.execute(
      new GetBlockStatusQuery(userA, userB),
    );
    return res.isBlocked || res.isBlocker;
  }

  async getBlockedUsersIds(
    userId: string,
    targetUserIds: string[],
  ): Promise<string[]> {
    return this.queryBus.execute(
      new GetBlockedUsersIdsQuery(userId, targetUserIds),
    );
  }

  async getBlockStatus(
    userId: string,
    targetUserId: string,
  ): Promise<BlockStatus> {
    return this.queryBus.execute(new GetBlockStatusQuery(userId, targetUserId));
  }

  async setHasConversation(userId: string, friendId: string): Promise<void> {
    await this.client.post(`${userId}/friends/${friendId}/conversation`);
  }
}
