import { Injectable } from '@nestjs/common';
import {
  BlockStatus,
  UserIntegrationPort,
} from '@modules/chat/application/ports/user-integration.port';
import { QueryBus } from '@nestjs/cqrs';
import { GetBlockStatusQuery } from '@modules/chat/application/queries/get-block-status/get-block-status.query';
import { GetBlockedUsersIdsQuery } from '@modules/chat/application/queries/get-blocked-users-ids/get-blocked-users-ids.query';

@Injectable()
export class UserIntegrationAdapter implements UserIntegrationPort {
  constructor(private readonly queryBus: QueryBus) {}

  async doesUserExist(id: string): Promise<boolean> {
    return true;
  }

  async getUserById(id: string): Promise<any | null> {
    return null;
  }

  async getUserIdsByNameOrUsername(username: string): Promise<any | null> {
    return null;
  }

  async userExists(options: any): Promise<boolean> {
    return false;
  }

  async getUsersByIds(userIds: string[]): Promise<any[]> {
    return [
      {
        id: '6acb66e3723bb913beb7918e',
        avatar: '1',
        username: 'ali',
      },
      {
        id: '6acb6810723bb913beb791b7',
        avatar: '2',
        username: 'sara',
      },
    ];
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
