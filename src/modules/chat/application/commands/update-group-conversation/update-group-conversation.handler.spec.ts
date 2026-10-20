import { Test, TestingModule } from '@nestjs/testing';
import { UpdateGroupConversationHandler } from './update-group-conversation.handler';
import { UpdateGroupConversationCommand } from './update-group-conversation.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { GroupAdminRequiredException } from '@modules/chat/domain/chat.exceptions';

describe('UpdateGroupConversationHandler', () => {
  let handler: UpdateGroupConversationHandler;
  let conversationRepository: jest.Mocked<ConversationRepositoryPort>;

  beforeEach(async () => {
    conversationRepository = {
      getConversationById: jest.fn(),
      saveConversation: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateGroupConversationHandler,
        {
          provide: ConversationRepositoryPort,
          useValue: conversationRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateGroupConversationHandler>(
      UpdateGroupConversationHandler,
    );
  });

  it('allows an active admin to update the group and records updatedBy', async () => {
    const conversation = ConversationEntity.createGroup('admin-1', 'Old name');
    conversation.addMember(
      ConversationMemberEntity.create(
        'admin-2',
        conversation.id,
        ConversationMemberRole.ADMIN,
      ),
    );

    conversationRepository.getConversationById.mockResolvedValue(conversation);
    conversationRepository.saveConversation.mockImplementation(
      async (item) => item,
    );

    const result = await handler.execute(
      new UpdateGroupConversationCommand(
        conversation.id,
        'admin-2',
        'New name',
      ),
    );

    expect(result.title).toBe('New name');
    expect(result.updatedBy).toBe('admin-2');
  });

  it('rejects an active non-admin member', async () => {
    const conversation = ConversationEntity.createGroup('admin-1', 'Old name');
    conversation.addMember(
      ConversationMemberEntity.create(
        'user-1',
        conversation.id,
        ConversationMemberRole.USER,
      ),
    );

    conversationRepository.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new UpdateGroupConversationCommand(
          conversation.id,
          'user-1',
          'New name',
        ),
      ),
    ).rejects.toBeInstanceOf(GroupAdminRequiredException);
  });

  it('rejects a user who is not a member', async () => {
    const conversation = ConversationEntity.createGroup('admin-1', 'Old name');
    conversationRepository.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new UpdateGroupConversationCommand(
          conversation.id,
          'outsider',
          'New name',
        ),
      ),
    ).rejects.toBeInstanceOf(GroupAdminRequiredException);
  });
});
