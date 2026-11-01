import { Test, TestingModule } from '@nestjs/testing';
import { MessageCreatedWsEventHandler } from './message-created.ws-handler';
import { ChatWsGateway } from '@modules/chat/presentation/ws/chat-ws.gateway';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { MessageCreatedDomainEvent } from '@modules/chat/contracts/events';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';

describe('MessageCreatedWsEventHandler', () => {
  let handler: MessageCreatedWsEventHandler;
  let chatWsGateway: jest.Mocked<ChatWsGateway>;
  let userIntegrationPort: jest.Mocked<UserIntegrationPort>;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;

  const buildMember = (id: string, userId: string) => ({
    id,
    userId,
    role: ConversationMemberRole.USER,
    status: ConversationMemberStatus.ACTIVE,
    isActive: () => true,
  });

  const buildConversation = (type = ConversationType.DIRECT) => {
    const members = [
      buildMember('member-1', 'user-1'),
      buildMember('member-2', 'user-2'),
    ];
    return {
      id: 'conv-1',
      type,
      members,
      getActiveMembers: () => members,
    };
  };

  beforeEach(async () => {
    chatWsGateway = {
      server: {},
      serverBroadcast: jest.fn(),
    } as unknown as jest.Mocked<ChatWsGateway>;

    userIntegrationPort = {
      getUsersByIds: jest.fn(),
    } as unknown as jest.Mocked<UserIntegrationPort>;

    commandRepo = {} as unknown as jest.Mocked<ConversationRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageCreatedWsEventHandler,
        { provide: ChatWsGateway, useValue: chatWsGateway },
        { provide: UserIntegrationPort, useValue: userIntegrationPort },
        { provide: ConversationRepositoryPort, useValue: commandRepo },
      ],
    }).compile();

    handler = module.get<MessageCreatedWsEventHandler>(
      MessageCreatedWsEventHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('should broadcast to the other active members of the conversation', async () => {
      const event = new MessageCreatedDomainEvent(
        'msg-1',
        'conv-1',
        'member-1',
        'hello',
        [],
        new Date(),
      );

      commandRepo.getConversationById = jest
        .fn()
        .mockResolvedValue(buildConversation());

      userIntegrationPort.getUsersByIds.mockResolvedValue([
        {
          id: 'user-1',
          username: 'username-user-1',
          avatarIndex: 1,
        },
      ]);

      await handler.handle(event);

      expect(chatWsGateway.serverBroadcast).toHaveBeenCalledWith(
        chatWsGateway.server,
        ['user-user-2'],
        expect.anything(),
        [],
      );
    });

    it('should broadcast group messages to the conversation room and to the recipients personal rooms', async () => {
      const event = new MessageCreatedDomainEvent(
        'msg-1',
        'conv-1',
        'member-1',
        'hello',
        [],
        new Date(),
      );

      commandRepo.getConversationById = jest
        .fn()
        .mockResolvedValue(buildConversation(ConversationType.GROUP));

      userIntegrationPort.getUsersByIds.mockResolvedValue([
        {
          id: 'user-1',
          username: 'username-user-1',
          avatarIndex: 1,
        },
      ]);

      await handler.handle(event);

      expect(chatWsGateway.serverBroadcast).toHaveBeenCalledWith(
        chatWsGateway.server,
        ['user-user-2', 'conversation-conv-1'],
        expect.anything(),
        ['user-user-1'],
      );
    });

    it('should not broadcast to a member that has the message deleted', async () => {
      const event = new MessageCreatedDomainEvent(
        'msg-1',
        'conv-1',
        'member-1',
        'hello',
        ['user-2'],
        new Date(),
      );

      commandRepo.getConversationById = jest
        .fn()
        .mockResolvedValue(buildConversation());

      userIntegrationPort.getUsersByIds.mockResolvedValue([
        {
          id: 'user-1',
          username: 'username-user-1',
          avatarIndex: 1,
        },
      ]);

      await handler.handle(event);

      expect(chatWsGateway.serverBroadcast).not.toHaveBeenCalled();
    });
  });
});
