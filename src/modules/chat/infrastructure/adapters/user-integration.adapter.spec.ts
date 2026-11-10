import { Test, TestingModule } from '@nestjs/testing';
import { UserIntegrationAdapter } from './user-integration.adapter';
import { QueryBus } from '@nestjs/cqrs';
import { GetBlockStatusQuery } from '@modules/chat/application/queries/get-block-status/get-block-status.query';
import { GetBlockedUsersIdsQuery } from '@modules/chat/application/queries/get-blocked-users-ids/get-blocked-users-ids.query';
import { PlatformApiClient } from '@infrastructure/platform-api/platform-api.client';

describe('UserIntegrationAdapter', () => {
  let adapter: UserIntegrationAdapter;
  let queryBusMock: any;
  let clientMock: any;

  beforeEach(async () => {
    queryBusMock = {
      execute: jest.fn(),
    };

    clientMock = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserIntegrationAdapter,
        { provide: QueryBus, useValue: queryBusMock },
        { provide: PlatformApiClient, useValue: clientMock },
      ],
    }).compile();

    adapter = module.get<UserIntegrationAdapter>(UserIntegrationAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('doesUserExist', () => {
    it('should return the platform result', async () => {
      clientMock.get.mockResolvedValue({ data: true });

      const result = await adapter.doesUserExist('user-1');

      expect(result).toBe(true);
      expect(clientMock.get).toHaveBeenCalledWith('user-1/exists');
    });

    it('should throw if the platform call fails', async () => {
      clientMock.get.mockRejectedValue(new Error('Other error'));

      await expect(adapter.doesUserExist('user-1')).rejects.toThrow(
        'Other error',
      );
    });
  });

  describe('hasBlockRelation', () => {
    it('should return true if blocked', async () => {
      queryBusMock.execute.mockResolvedValue({
        isBlocked: true,
        isBlocker: false,
      });
      const result = await adapter.hasBlockRelation('user-1', 'user-2');
      expect(result).toBe(true);
      expect(queryBusMock.execute).toHaveBeenCalledWith(
        new GetBlockStatusQuery('user-1', 'user-2'),
      );
    });

    it('should return true if blocker', async () => {
      queryBusMock.execute.mockResolvedValue({
        isBlocked: false,
        isBlocker: true,
      });
      const result = await adapter.hasBlockRelation('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('should return false if neither', async () => {
      queryBusMock.execute.mockResolvedValue({
        isBlocked: false,
        isBlocker: false,
      });
      const result = await adapter.hasBlockRelation('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  describe('getUserById', () => {
    it('should return ChatUser', async () => {
      clientMock.get.mockResolvedValue({
        data: {
          id: 'user-1',
          username: 'test',
          firstName: 'Test',
          lastName: 'User',
          avatar: null,
        },
      });

      const result = await adapter.getUserById('user-1');

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('test');
      expect(clientMock.get).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUsersByIds', () => {
    it('should send the ids to the platform batch endpoint', async () => {
      const users = [
        { id: 'user-1', username: 'test', avatarIndex: 1, isDmEnabled: true },
      ];
      clientMock.post.mockResolvedValue({ data: users });

      const result = await adapter.getUsersByIds(['user-1']);

      expect(clientMock.post).toHaveBeenCalledWith('batch', {
        ids: ['user-1'],
      });
      expect(result).toEqual(users);
    });
  });

  describe('getFriends', () => {
    it('should call the platform friends endpoint with the isDmEnabled filter', async () => {
      clientMock.get.mockResolvedValue({
        data: [
          {
            userId: 'user-2',
            userName: 'jane',
            userAvatar: 'jane.png',
            userIndexAvatar: 1,
            isDmEnabled: false,
          },
          {
            friendId: 'user-3',
            name: 'john',
            isDmEnabled: true,
          },
        ],
      });

      const result = await adapter.getFriends('user-1', {
        isDmEnabled: false,
      });

      expect(clientMock.get).toHaveBeenCalledWith('user-1/friends', {
        isDmEnabled: false,
      });
      expect(result).toEqual([
        {
          id: 'user-2',
          username: 'jane',
          avatarIndex: 1,
          avatar: 'jane.png',
          isDmEnabled: false,
        },
        {
          id: 'user-3',
          username: 'john',
          avatarIndex: 0,
          avatar: undefined,
          isDmEnabled: true,
        },
      ]);
    });

    it('should omit the filter when isDmEnabled is not provided', async () => {
      clientMock.get.mockResolvedValue({ data: [] });

      const result = await adapter.getFriends('user-1');

      expect(clientMock.get).toHaveBeenCalledWith('user-1/friends', {});
      expect(result).toEqual([]);
    });
  });

  // describe('getUserIdsByNameOrUsername', () => {
  //   it('should return array of ids', async () => {
  //     queryBusMock.execute.mockResolvedValue(['user-1']);
  //     const result = await adapter.getUserIdsByNameOrUsername('test');
  //     expect(result).toEqual(['user-1']);
  //     expect(queryBusMock.execute).toHaveBeenCalledWith(
  //       new GetUserIdsByNameOrUsernameQuery('test'),
  //     );
  //   });
  // });

  describe('getBlockedUsersIds', () => {
    it('should return array of blocked ids', async () => {
      queryBusMock.execute.mockResolvedValue(['user-2']);
      const result = await adapter.getBlockedUsersIds('user-1', ['user-2']);
      expect(result).toEqual(['user-2']);
      expect(queryBusMock.execute).toHaveBeenCalledWith(
        new GetBlockedUsersIdsQuery('user-1', ['user-2']),
      );
    });
  });

  describe('getBlockStatus', () => {
    it('should return block status', async () => {
      queryBusMock.execute.mockResolvedValue({
        isBlocked: true,
        isBlocker: false,
      });
      const result = await adapter.getBlockStatus('user-1', 'user-2');
      expect(result).toEqual({ isBlocked: true, isBlocker: false });
      expect(queryBusMock.execute).toHaveBeenCalledWith(
        new GetBlockStatusQuery('user-1', 'user-2'),
      );
    });
  });
});
