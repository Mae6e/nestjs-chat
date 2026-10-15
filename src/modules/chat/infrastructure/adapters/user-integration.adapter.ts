import { Body, Injectable } from '@nestjs/common';
import {
  BlockStatus,
  UserIntegrationPort,
} from '@modules/chat/application/ports/user-integration.port';
import { QueryBus } from '@nestjs/cqrs';
import { GetBlockStatusQuery } from '@modules/chat/application/queries/get-block-status/get-block-status.query';
import { GetBlockedUsersIdsQuery } from '@modules/chat/application/queries/get-blocked-users-ids/get-blocked-users-ids.query';
import { PlatformApiClient } from '@infrastructure/platform-api/platform-api.client';

@Injectable()
export class UserIntegrationAdapter implements UserIntegrationPort {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly client: PlatformApiClient,
  ) {}

  async doesUserExist(id: string): Promise<boolean> {
    const response: boolean = await this.client.get(`${id}/exists`);
    return response;
  }

  async getUserById(id: string): Promise<any | null> {
    return null;
  }

  async getUserIdsByNameOrUsername(username: string): Promise<any | null> {
    return null;
  }

  async getUsersByIds(userIds: string[]): Promise<any[]> {
    return await this.client.post(`batch`, {
      ids: userIds,
    });
  }

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
}
