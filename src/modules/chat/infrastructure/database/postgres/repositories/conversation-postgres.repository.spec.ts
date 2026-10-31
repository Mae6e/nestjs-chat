import { Test, TestingModule } from '@nestjs/testing';
import { ConversationPostgresRepository } from './conversation-postgres.repository';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { Conversation } from '../entities/conversation.entity';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { MessageEntity } from '@modules/chat/domain/models/message.model';
import { MessageType } from '@modules/chat/domain/enums/chat-type.enum';

describe('ConversationPostgresRepository', () => {
  let repository: ConversationPostgresRepository;
  let dataSourceMock: any;
  let queryBuilderMock: any;
  let entityManagerMock: any;
  let repoMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      getExists: jest.fn(),
      softDelete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    repoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    entityManagerMock = {
      save: jest.fn(),
      getRepository: jest.fn().mockReturnValue(repoMock),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      findOne: jest.fn(),
    };

    dataSourceMock = {
      getRepository: jest.fn().mockReturnValue(repoMock),
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(entityManagerMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationPostgresRepository,
        {
          provide: getDataSourceToken(DatabaseType.POSTGRES),
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    repository = module.get<ConversationPostgresRepository>(
      ConversationPostgresRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getConversationById', () => {
    it('should return null if not found', async () => {
      repoMock.findOne.mockResolvedValue(null);
      const result = await repository.getConversationById('conv-1');
      expect(result).toBeNull();
    });

    it('should return domain entity if found', async () => {
      const conv = new Conversation();
      conv.id = 'conv-1';
      conv.type = ConversationType.DIRECT;
      conv.created_at = new Date();
      conv.updated_at = new Date();
      conv.conversationMembers = [];

      repoMock.findOne.mockResolvedValue(conv);

      const result = await repository.getConversationById('conv-1');
      expect(result).toBeInstanceOf(ConversationEntity);
      expect(result?.id).toBe('conv-1');
    });
  });

  describe('saveConversation', () => {
    it('should save and return conversation', async () => {
      const conv = ConversationEntity.createDirect('user-1', 'user-2');
      entityManagerMock.save.mockImplementation(async (entity) => entity);
      entityManagerMock.findOne.mockResolvedValue(
        Conversation.fromDomain(conv),
      );

      const result = await repository.saveConversation(conv);

      expect(entityManagerMock.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ConversationEntity);
      expect(result.id).toBe(conv.id);
    });
  });

  describe('saveMessage', () => {
    it('should save message and update members', async () => {
      const msg = MessageEntity.create(
        'hello',
        MessageType.TEXT,
        'user-1',
        'conv-1',
        ['user-2'],
      );
      entityManagerMock.save.mockImplementation(async (entity) => entity);
      queryBuilderMock.getMany.mockResolvedValue([
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ]);

      const result = await repository.saveMessage(msg);

      expect(entityManagerMock.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(MessageEntity);
      expect(result.id).toBe(msg.id);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation and return true', async () => {
      queryBuilderMock.execute.mockResolvedValue({ affected: 1 });
      const result = await repository.deleteConversation('conv-1');
      expect(result).toBe(true);
    });
  });

  describe('hasActiveGroupMembership', () => {
    it('should return true when the user is active in a group', async () => {
      queryBuilderMock.getExists.mockResolvedValue(true);

      const result = await repository.hasActiveGroupMembership('user-1');

      expect(result).toBe(true);
      expect(queryBuilderMock.innerJoin).toHaveBeenCalledWith(
        'cm.conversation',
        'c',
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('c.type = :type', {
        type: ConversationType.GROUP,
      });
    });

    it('should exclude the given conversation', async () => {
      queryBuilderMock.getExists.mockResolvedValue(false);

      const result = await repository.hasActiveGroupMembership(
        'user-1',
        'conv-1',
      );

      expect(result).toBe(false);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'cm.conversation_id != :exceptConversationId',
        { exceptConversationId: 'conv-1' },
      );
    });
  });

  describe('deletePendingMembershipsForUser', () => {
    it('should soft-delete pending memberships and set deleted_by', async () => {
      queryBuilderMock.getRawMany.mockResolvedValue([
        { id: 'cm-1' },
        { id: 'cm-2' },
      ]);
      queryBuilderMock.execute.mockResolvedValue({ affected: 2 });

      const result = await repository.deletePendingMembershipsForUser(
        'user-1',
        'conv-keep',
        'admin',
      );

      expect(result).toBe(2);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'cm.conversation_id != :exceptConversationId',
        { exceptConversationId: 'conv-keep' },
      );
      expect(queryBuilderMock.whereInIds).toHaveBeenCalledWith([
        'cm-1',
        'cm-2',
      ]);
      expect(queryBuilderMock.set).toHaveBeenCalledWith({
        deleted_by: 'admin',
      });
      expect(queryBuilderMock.softDelete).toHaveBeenCalled();
    });

    it('should return 0 without deleting when there is no pending request', async () => {
      queryBuilderMock.getRawMany.mockResolvedValue([]);

      const result = await repository.deletePendingMembershipsForUser('user-1');

      expect(result).toBe(0);
      expect(queryBuilderMock.softDelete).not.toHaveBeenCalled();
      expect(queryBuilderMock.set).not.toHaveBeenCalled();
    });
  });

  describe('block', () => {
    it('should return false if already blocked', async () => {
      queryBuilderMock.getExists.mockResolvedValue(true);
      const result = await repository.block('blocker', 'blocked');
      expect(result).toBe(false);
    });

    it('should insert block and return true if not blocked', async () => {
      queryBuilderMock.getExists.mockResolvedValue(false);
      const result = await repository.block('blocker', 'blocked');
      expect(repoMock.insert).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('unblock', () => {
    it('should execute soft delete and return true if affected', async () => {
      queryBuilderMock.execute.mockResolvedValue({ affected: 1 });
      const result = await repository.unblock('blocker', 'blocked');
      expect(result).toBe(true);
    });
  });

  describe('getBlockStatus', () => {
    it('should return true if blocked', async () => {
      queryBuilderMock.getExists.mockResolvedValue(true);
      const result = await repository.getBlockStatus('blocker', 'blocked');
      expect(result).toBe(true);
    });
  });

  describe('getBlockedUserIds', () => {
    it('should return array of blocked ids', async () => {
      queryBuilderMock.getRawMany.mockResolvedValue([
        { blockedId: 'blocked-1' },
      ]);
      const result = await repository.getBlockedUserIds('blocker', [
        'blocked-1',
      ]);
      expect(result).toEqual(['blocked-1']);
    });
  });
});
