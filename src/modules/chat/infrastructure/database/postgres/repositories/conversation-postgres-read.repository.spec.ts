import { Test, TestingModule } from '@nestjs/testing';
import { ConversationPostgresReadRepository } from './conversation-postgres-read.repository';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { UserBlock } from '../entities/user-block.entity';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

describe('ConversationPostgresReadRepository', () => {
  let repository: ConversationPostgresReadRepository;
  let dataSourceMock: any;
  let queryBuilderMock: any;
  let conversationRepoMock: any;
  let messageRepoMock: any;
  let conversationMemberRepoMock: any;
  let userBlockRepoMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      andWhereExists: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue(''),
      getExists: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    conversationRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    messageRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    conversationMemberRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    userBlockRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    dataSourceMock = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const entityManager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === Message) return messageRepoMock;
            return {
              createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
            };
          }),
        };
        return cb(entityManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationPostgresReadRepository,
        {
          provide: getRepositoryToken(Conversation, DatabaseType.POSTGRES),
          useValue: conversationRepoMock,
        },
        {
          provide: getRepositoryToken(Message, DatabaseType.POSTGRES),
          useValue: messageRepoMock,
        },
        {
          provide: getRepositoryToken(
            ConversationMember,
            DatabaseType.POSTGRES,
          ),
          useValue: conversationMemberRepoMock,
        },
        {
          provide: getRepositoryToken(UserBlock, DatabaseType.POSTGRES),
          useValue: userBlockRepoMock,
        },
        {
          provide: getDataSourceToken(DatabaseType.POSTGRES),
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    repository = module.get<ConversationPostgresReadRepository>(
      ConversationPostgresReadRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('conversationExists', () => {
    it('should return boolean', async () => {
      queryBuilderMock.getExists.mockResolvedValue(true);
      const result = await repository.conversationExists('user-1', 'user-2');
      expect(result).toBe(true);
    });
  });

  describe('getUserConversationList', () => {
    it('should return empty paginated result if no conversations', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);
      const result = await repository.getUserConversationList('user-1', {
        pagination: { page: 1, pageSize: 10, limit: 10, offset: 0 },
      });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return mapped conversations', async () => {
      const convDate = new Date();
      queryBuilderMock.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'conv-1',
            type: ConversationType.DIRECT,
            created_at: convDate,
            updated_at: convDate,
            conversationMembers: [{ user_id: 'user-1' }],
          },
        ],
        1,
      ]);
      queryBuilderMock.getRawMany.mockResolvedValue([
        { conversationId: 'conv-1', notSeenCount: '1' },
      ]);
      queryBuilderMock.getMany.mockResolvedValue([
        { conversation_id: 'conv-1', user_id: 'user-2' },
      ]);

      const result = await repository.getUserConversationList('user-1', {
        pagination: { page: 1, pageSize: 10, limit: 10, offset: 0 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('conv-1');
      expect(result.data[0].notSeenCount).toBe(1);
    });

    it('should match conversations by user filter or title search', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.getUserConversationList('user-1', {
        pagination: { page: 1, pageSize: 10, limit: 10, offset: 0 },
        filterUserIds: ['user-2'],
        titleSearch: '  team  ',
      });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(EXISTS (SELECT 1 FROM chat.conversation_members cm_filter WHERE cm_filter.user_id IN (:...filterUserIds) AND cm_filter.conversation_id = c.id) OR c.title ILIKE :titleSearch)',
        { filterUserIds: ['user-2'], titleSearch: '%team%' },
      );
    });

    it('should search conversation titles without a user filter', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.getUserConversationList('user-1', {
        pagination: { page: 1, pageSize: 10, limit: 10, offset: 0 },
        titleSearch: 'team',
      });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(c.title ILIKE :titleSearch)',
        { titleSearch: '%team%' },
      );
    });
  });

  describe('getUserGroupConversationList', () => {
    it('should return all groups without filtering by membership', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-02T00:00:00.000Z');

      queryBuilderMock.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'group-mine',
            type: ConversationType.GROUP,
            identifier: 'should-not-be-returned',
            title: 'My group',
            picture: null,
            created_by: 'user-1',
            created_at: createdAt,
            updated_at: updatedAt,
          },
          {
            id: 'group-other',
            type: ConversationType.GROUP,
            identifier: 'should-not-be-returned',
            title: 'Another group',
            picture: null,
            created_by: 'user-2',
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
        2,
      ]);
      queryBuilderMock.getRawMany
        .mockResolvedValueOnce([
          { conversationId: 'group-mine', notSeenCount: '3' },
          { conversationId: 'group-other', notSeenCount: '0' },
        ])
        .mockResolvedValueOnce([
          { conversationId: 'group-mine', memberCount: '2' },
          { conversationId: 'group-other', memberCount: '4' },
        ]);

      const result = await repository.getUserGroupConversationList('user-1', {
        page: 1,
        pageSize: 10,
        limit: 10,
        offset: 0,
      });

      expect(queryBuilderMock.innerJoin).not.toHaveBeenCalled();
      expect(queryBuilderMock.innerJoinAndSelect).not.toHaveBeenCalled();
      expect(queryBuilderMock.andWhereExists).not.toHaveBeenCalled();
      expect(queryBuilderMock.where).toHaveBeenCalledWith('c.type = :type', {
        type: ConversationType.GROUP,
      });
      expect(result.data).toEqual([
        {
          id: 'group-mine',
          title: 'My group',
          picture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          memberCount: 2,
          createdByMe: true,
          notSeenCount: 3,
        },
        {
          id: 'group-other',
          title: 'Another group',
          picture: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          memberCount: 4,
          createdByMe: false,
          notSeenCount: 0,
        },
      ]);
      expect(result.data[0]).not.toHaveProperty('identifier');
      expect(result.data[0]).not.toHaveProperty('lastMessage');
      expect(result.data[0]).not.toHaveProperty('updatedBy');
      expect(result.data[0]).not.toHaveProperty('type');
    });

    it('should filter groups by title', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.getUserGroupConversationList(
        'user-1',
        {
          page: 1,
          pageSize: 10,
          limit: 10,
          offset: 0,
        },
        '  team  ',
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'c.title ILIKE :search',
        { search: '%team%' },
      );
    });

    it('should include groups where the user is an active or pending member', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.getUserGroupConversationList(
        'user-1',
        {
          page: 1,
          pageSize: 10,
          limit: 10,
          offset: 0,
        },
        undefined,
        true,
      );

      expect(queryBuilderMock.innerJoinAndSelect).toHaveBeenCalledWith(
        'c.conversationMembers',
        'cm_joined',
        'cm_joined.user_id = :userId AND cm_joined.status IN (:...memberStatuses)',
        {
          userId: 'user-1',
          memberStatuses: [
            ConversationMemberStatus.ACTIVE,
            ConversationMemberStatus.PENDING,
          ],
        },
      );
      expect(queryBuilderMock.andWhereExists).not.toHaveBeenCalled();
    });

    it('should map the current user membership status and role', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-02T00:00:00.000Z');
      queryBuilderMock.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'group-1',
            type: ConversationType.GROUP,
            title: 'Team',
            picture: null,
            created_by: 'user-2',
            created_at: createdAt,
            updated_at: updatedAt,
            conversationMembers: [
              {
                user_id: 'user-1',
                status: ConversationMemberStatus.PENDING,
                role: ConversationMemberRole.USER,
              },
            ],
          },
        ],
        1,
      ]);
      queryBuilderMock.getRawMany
        .mockResolvedValueOnce([
          { conversationId: 'group-1', notSeenCount: '0' },
        ])
        .mockResolvedValueOnce([
          { conversationId: 'group-1', memberCount: '3' },
        ]);

      const result = await repository.getUserGroupConversationList(
        'user-1',
        {
          page: 1,
          pageSize: 10,
          limit: 10,
          offset: 0,
        },
        undefined,
        true,
      );

      expect(result.data[0]).toEqual({
        id: 'group-1',
        title: 'Team',
        picture: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        memberCount: 3,
        createdByMe: false,
        notSeenCount: 0,
        status: ConversationMemberStatus.PENDING,
        role: ConversationMemberRole.USER,
      });
      expect(result.data[0]).not.toHaveProperty('type');
    });
  });

  describe('getUserConversationIds', () => {
    it('should return array of ids', async () => {
      queryBuilderMock.getMany.mockResolvedValue([{ id: 'conv-1' }]);
      const result = await repository.getUserConversationIds('user-1', {});
      expect(result).toEqual(['conv-1']);
    });
  });

  describe('getUserConversationById', () => {
    it('should return null if not found', async () => {
      queryBuilderMock.getOne.mockResolvedValue(null);
      const result = await repository.getUserConversationById(
        'conv-1',
        'user-1',
      );
      expect(result).toBeNull();
    });

    it('should return dto if found', async () => {
      const convDate = new Date();
      queryBuilderMock.getOne.mockResolvedValue({
        id: 'conv-1',
        type: ConversationType.DIRECT,
        created_at: convDate,
        updated_at: convDate,
        conversationMembers: [{ id: 'cm-1', user_id: 'user-1' }],
      });

      const result = await repository.getUserConversationById(
        'conv-1',
        'user-1',
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('conv-1');
    });
  });

  describe('getUserConversationMessageList', () => {
    it('should return paginated messages', async () => {
      const msgDate = new Date();
      queryBuilderMock.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'msg-1',
            text: 'hello',
            sender_id: 'user-1',
            created_at: msgDate,
          },
        ],
        1,
      ]);

      const result = await repository.getUserConversationMessageList(
        'conv-1',
        'user-1',
        {
          page: 1,
          pageSize: 10,
          limit: 10,
          offset: 0,
        },
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getBlockStatus', () => {
    it('should return boolean', async () => {
      queryBuilderMock.getExists.mockResolvedValue(true);
      const result = await repository.getBlockStatus('user-1', 'user-2');
      expect(result).toBe(true);
    });
  });

  describe('getBlockedUserIds', () => {
    it('should return array of ids without blockedIds filter', async () => {
      queryBuilderMock.getRawMany.mockResolvedValue([{ blockedId: 'user-2' }]);
      const result = await repository.getBlockedUserIds('user-1');
      expect(result).toEqual(['user-2']);
    });

    it('should return array of ids with blockedIds filter', async () => {
      queryBuilderMock.getRawMany.mockResolvedValue([{ blockedId: 'user-2' }]);
      const result = await repository.getBlockedUserIds('user-1', ['user-2']);
      expect(result).toEqual(['user-2']);
    });
  });
});
