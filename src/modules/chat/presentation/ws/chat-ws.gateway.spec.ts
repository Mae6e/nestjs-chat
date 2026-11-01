import { Test, TestingModule } from '@nestjs/testing';
import { ChatWsGateway } from './chat-ws.gateway';
import { ChatWsGuard } from './guards/chat-ws.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { Server } from 'socket.io';
import { AuthIntegrationPort } from '@modules/chat/application/ports/auth-integration.port';
import { WsException } from '@nestjs/websockets';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { DeleteConversationCommand } from '@modules/chat/application/commands/delete-conversation/delete-conversation.command';
import { GetUserConversationListQuery } from '@modules/chat/application/queries/get-user-conversation-list/get-user-conversation-list.query';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { FileStoragePort } from '@modules/chat/application/ports/file-storage.port';

describe('ChatWsGateway', () => {
  let gateway: ChatWsGateway;
  let chatWsGuard: jest.Mocked<ChatWsGuard>;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let userIntegrationPort: jest.Mocked<UserIntegrationPort>;
  let conversationRepository: jest.Mocked<ConversationRepositoryPort>;

  beforeEach(async () => {
    chatWsGuard = {
      authenticateUser: jest.fn(),
      canActivate: jest.fn(),
    } as unknown as jest.Mocked<ChatWsGuard>;

    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    userIntegrationPort = {
      getUserById: jest.fn(),
      getBlockStatus: jest.fn(),
      getUserIdsByNameOrUsername: jest.fn(),
      getUsersByIds: jest.fn(),
      getBlockedUsersIds: jest.fn(),
    } as unknown as jest.Mocked<UserIntegrationPort>;
    conversationRepository = {
      getConversationById: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepositoryPort>;
    const fileStorage = {
      saveGroupPicture: jest.fn(),
      deleteGroupPicture: jest.fn(),
      getGroupPictureUrl: jest.fn((picture: string | null) =>
        picture
          ? picture.startsWith('/')
            ? picture
            : `/uploads/group-pictures/${picture}`
          : null,
      ),
      normalizeGroupPictureKey: jest.fn((picture: string) => picture),
    } as unknown as jest.Mocked<FileStoragePort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatWsGateway,
        { provide: ChatWsGuard, useValue: chatWsGuard },
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: UserIntegrationPort, useValue: userIntegrationPort },
        {
          provide: ConversationRepositoryPort,
          useValue: conversationRepository,
        },
        { provide: FileStoragePort, useValue: fileStorage },
        { provide: AuthIntegrationPort, useValue: {} },
      ],
    })
      .overrideGuard(ChatWsGuard)
      .useValue(chatWsGuard)
      .compile();

    gateway = module.get<ChatWsGateway>(ChatWsGateway);
    gateway.server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as unknown as Server;
    gateway.broadcast = jest.fn();
  });

  describe('afterInit', () => {
    it('should run without error', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  describe('createDirectConversation', () => {
    it('should throw if target user is blocked', async () => {
      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any);
      userIntegrationPort.getBlockStatus.mockResolvedValue({
        isBlocker: true,
        isBlocked: false,
      });

      await expect(
        gateway.createDirectConversation(
          {} as any,
          { targetUserId: 'user-2', content: 'hello' },
          'user-1',
        ),
      ).rejects.toThrow(WsException);
    });

    it('should create conversation, broadcast, and return result', async () => {
      userIntegrationPort.getUsersByIds.mockResolvedValue([
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
        },
        {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
        },
      ] as any);
      userIntegrationPort.getBlockStatus.mockResolvedValue({
        isBlocker: false,
        isBlocked: false,
      });

      commandBus.execute
        .mockResolvedValueOnce({ id: 'conv-1', identifier: 'test-ident' }) // create conversation
        .mockResolvedValueOnce({
          id: 'msg-1',
          text: 'hello',
          createdAt: new Date(),
          deletedForUserIds: [],
          conversation: { id: 'conv-1' },
          conversationId: 'conv-1',
        }); // create message

      const result = await gateway.createDirectConversation(
        {} as any,
        { targetUserId: 'user-2', content: 'hello' },
        'user-1',
      );
      expect(result.id).toBe('conv-1');
      expect(gateway.broadcast).toHaveBeenCalled();
    });

    it('should rollback conversation if message creation fails', async () => {
      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any);
      userIntegrationPort.getBlockStatus.mockResolvedValue({
        isBlocker: false,
        isBlocked: false,
      });

      commandBus.execute
        .mockResolvedValueOnce({ id: 'conv-1' })
        .mockRejectedValueOnce(new Error('fail msg'));

      await expect(
        gateway.createDirectConversation(
          {} as any,
          { targetUserId: 'user-2', content: 'hello' },
          'user-1',
        ),
      ).rejects.toThrow('fail msg');

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteConversationCommand('conv-1'),
      );
    });
  });

  describe('getUserConversationList', () => {
    it('should return paginated and mapped conversations', async () => {
      queryBus.execute.mockResolvedValue({
        meta: { total: 1, page: 1, pageSize: 10 },
        data: [
          {
            id: 'conv-1',
            type: ConversationType.DIRECT,
            members: [
              { userId: 'user-1', notSeenCount: 0 },
              { userId: 'user-2' },
            ],
            lastMessage: {
              id: 'msg-1',
              senderId: 'user-1',
              createdAt: new Date(),
            },
          },
        ],
      });

      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janes',
        },
      ] as any);

      const result = await gateway.getUserConversationList(
        { page: 1, pageSize: 10, targetUserId: 'other' } as any,
        'user-1',
      );
      expect(result.data[0].id).toBe('conv-1');
      expect(result.data[0].identifier).toBe('janes');

      const query = queryBus.execute.mock
        .calls[0][0] as GetUserConversationListQuery;
      expect(query.options.type).toBe(ConversationType.DIRECT);
    });

    it('should list group conversations when type is GROUP', async () => {
      queryBus.execute.mockResolvedValue({ meta: {}, data: [] });
      userIntegrationPort.getUsersByIds.mockResolvedValue([]);

      await gateway.getUserConversationList(
        { page: 1, pageSize: 10, type: ConversationType.GROUP } as any,
        'user-1',
      );

      const query = queryBus.execute.mock
        .calls[0][0] as GetUserConversationListQuery;
      expect(query.options.type).toBe(ConversationType.GROUP);
    });

    it('should keep an explicit DIRECT type', async () => {
      queryBus.execute.mockResolvedValue({ meta: {}, data: [] });
      userIntegrationPort.getUsersByIds.mockResolvedValue([]);

      await gateway.getUserConversationList(
        { page: 1, pageSize: 10, type: ConversationType.DIRECT } as any,
        'user-1',
      );

      const query = queryBus.execute.mock
        .calls[0][0] as GetUserConversationListQuery;
      expect(query.options.type).toBe(ConversationType.DIRECT);
    });

    it('should filter by username', async () => {
      userIntegrationPort.getUserIdsByNameOrUsername.mockResolvedValue([
        'user-2',
      ]);
      queryBus.execute.mockResolvedValue({ meta: {}, data: [] });
      userIntegrationPort.getUsersByIds.mockResolvedValue([]);

      await gateway.getUserConversationList(
        { page: 1, pageSize: 10, filter: 'jan', targetUserId: 'other' } as any,
        'user-1',
      );
      expect(
        userIntegrationPort.getUserIdsByNameOrUsername,
      ).toHaveBeenCalledWith('jan');
      const query = queryBus.execute.mock
        .calls[0][0] as GetUserConversationListQuery;
      expect(query.options.titleSearch).toBe('jan');
    });

    it('should still search titles when the filter resolves to 0 users', async () => {
      userIntegrationPort.getUserIdsByNameOrUsername.mockResolvedValue([]);
      queryBus.execute.mockResolvedValue({ meta: {}, data: [] });
      const result = await gateway.getUserConversationList(
        { page: 1, pageSize: 10, filter: 'jan', targetUserId: 'other' } as any,
        'user-1',
      );
      expect(result.data).toEqual([]);
      const query = queryBus.execute.mock
        .calls[0][0] as GetUserConversationListQuery;
      expect(query.options.titleSearch).toBe('jan');
    });
  });

  describe('createMessage', () => {
    it('should throw if target is blocked', async () => {
      queryBus.execute.mockResolvedValue({
        id: 'conv-1',
        type: ConversationType.DIRECT,
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });
      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any);
      userIntegrationPort.getBlockStatus.mockResolvedValue({
        isBlocker: true,
        isBlocked: false,
      });

      await expect(
        gateway.createMessage(
          {} as any,
          { conversationId: 'conv-1', text: 'hi' },
          'user-1',
        ),
      ).rejects.toThrow(WsException);
    });

    it('should create message', async () => {
      queryBus.execute.mockResolvedValue({
        id: 'conv-1',
        type: ConversationType.DIRECT,
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });
      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1', firstName: 'J', username: 'user1' },
        { id: 'user-2', firstName: 'M', username: 'user2' },
      ] as any);
      userIntegrationPort.getBlockStatus.mockResolvedValue({
        isBlocker: false,
        isBlocked: false,
      });
      commandBus.execute.mockResolvedValue({
        id: 'msg-1',
        createdAt: new Date(),
        text: 'hi',
      });

      const result = await gateway.createMessage(
        {} as any,
        { conversationId: 'conv-1', text: 'hi' },
        'user-1',
      );
      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('hi');
    });

    it('should throw if conversation missing target member', async () => {
      queryBus.execute.mockResolvedValue({
        id: 'conv-1',
        type: ConversationType.DIRECT,
        members: [{ userId: 'user-1' }],
      });
      await expect(
        gateway.createMessage(
          {} as any,
          { conversationId: 'conv-1', text: 'hi' },
          'user-1',
        ),
      ).rejects.toThrow(WsException);
    });
  });

  describe('getConversationMessageList', () => {
    it('should return mapped messages and members', async () => {
      queryBus.execute
        .mockResolvedValueOnce({
          id: 'conv-1',
          type: ConversationType.DIRECT,
          members: [
            { userId: 'user-1', lastSeenMessage: { createdAt: new Date() } },
            { userId: 'user-2', lastSeenMessage: { createdAt: new Date() } },
          ],
        })
        .mockResolvedValueOnce({
          meta: { total: 1, page: 1, pageSize: 10 },
          data: [
            {
              id: 'msg-1',
              senderId: 'user-1',
              text: 'hi',
              createdAt: new Date(),
            },
          ],
        });

      userIntegrationPort.getUsersByIds.mockResolvedValue([
        { id: 'user-1', firstName: 'J' },
        { id: 'user-2', firstName: 'M' },
      ] as any);
      userIntegrationPort.getBlockedUsersIds.mockResolvedValue([]);

      const result = await gateway.getConversationMessageList(
        {} as any,
        { conversationId: 'conv-1', page: 1, pageSize: 10 },
        'user-1',
      );
      expect(result.messages.list[0].id).toBe('msg-1');
      expect(result.members).toHaveLength(1); // excluding authUserId
    });
  });

  describe('group room membership', () => {
    const client = {} as any;

    beforeEach(() => {
      gateway.joinConversationRoom = jest
        .fn()
        .mockResolvedValue(undefined) as any;
      gateway.leaveConversationRoom = jest
        .fn()
        .mockResolvedValue(undefined) as any;
    });

    it('should join the approved user to the group and notify their personal room', async () => {
      commandBus.execute.mockResolvedValue({ status: 'ACTIVE' });

      await gateway.approveGroupJoinRequest(
        client,
        { conversationId: 'conv-1', userId: 'user-2' } as any,
        'admin-1',
      );

      expect(gateway.joinConversationRoom).toHaveBeenCalledWith(
        'user-2',
        'conv-1',
      );
      expect(gateway.broadcast).toHaveBeenCalledWith(
        client,
        ['conversation-conv-1', 'user-user-2'],
        expect.anything(),
      );
    });

    it('should notify and remove a member from the group room', async () => {
      conversationRepository.getConversationById.mockResolvedValue({
        id: 'conv-1',
      } as any);
      commandBus.execute.mockResolvedValue({});

      await gateway.removeGroupMember(
        client,
        { conversationId: 'conv-1', userId: 'user-2' } as any,
        'admin-1',
      );

      expect(gateway.broadcast).toHaveBeenCalledWith(
        client,
        ['conversation-conv-1', 'user-user-2'],
        expect.anything(),
      );
      expect(gateway.leaveConversationRoom).toHaveBeenCalledWith(
        'user-2',
        'conv-1',
      );
    });

    it('should notify the leaving user and drop them from the group room', async () => {
      conversationRepository.getConversationById.mockResolvedValue({
        id: 'conv-1',
      } as any);
      commandBus.execute.mockResolvedValue({
        promotedAdminId: null,
        conversationDeleted: false,
      });

      await gateway.leaveGroup(
        client,
        { conversationId: 'conv-1' } as any,
        'user-2',
      );

      expect(gateway.broadcast).toHaveBeenCalledWith(
        client,
        ['conversation-conv-1', 'user-user-2'],
        expect.anything(),
      );
      expect(gateway.leaveConversationRoom).toHaveBeenCalledWith(
        'user-2',
        'conv-1',
      );
    });

    it('should join added members to the group room', async () => {
      commandBus.execute.mockResolvedValue([
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      await gateway.addGroupMembers(
        client,
        { conversationId: 'conv-1', userIds: ['user-2', 'user-3'] } as any,
        'admin-1',
      );

      expect(gateway.joinConversationRoom).toHaveBeenCalledWith(
        'user-2',
        'conv-1',
      );
      expect(gateway.joinConversationRoom).toHaveBeenCalledWith(
        'user-3',
        'conv-1',
      );
      expect(gateway.broadcast).toHaveBeenCalledWith(
        client,
        ['conversation-conv-1', 'user-user-2', 'user-user-3'],
        expect.anything(),
      );
    });
  });

  describe('markMessageAsSeen', () => {
    it('should throw if not a member', async () => {
      queryBus.execute.mockResolvedValue({
        id: 'conv-1',
        members: [{ userId: 'user-2' }],
      });
      await expect(
        gateway.markMessageAsSeen(
          {} as any,
          { conversationId: 'conv-1', messageId: 'msg-1' },
          'user-1',
        ),
      ).rejects.toThrow(WsException);
    });

    it('should execute command and broadcast', async () => {
      queryBus.execute.mockResolvedValue({
        id: 'conv-1',
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });
      commandBus.execute.mockResolvedValue({});

      await gateway.markMessageAsSeen(
        {} as any,
        { conversationId: 'conv-1', messageId: 'msg-1' },
        'user-1',
      );
      expect(commandBus.execute).toHaveBeenCalled();
      expect(gateway.broadcast).toHaveBeenCalled();
    });
  });
});
