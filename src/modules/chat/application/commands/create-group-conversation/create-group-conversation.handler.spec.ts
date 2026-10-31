import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateGroupConversationHandler } from './create-group-conversation.handler';
import { CreateGroupConversationCommand } from './create-group-conversation.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { UserAlreadyInGroupException } from '@modules/chat/domain/chat.exceptions';

describe('CreateGroupConversationHandler', () => {
  let handler: CreateGroupConversationHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;
  let publisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    commandRepo = {
      saveConversation: jest.fn(async (conversation) => conversation),
      hasActiveGroupMembership: jest.fn(async () => false),
      deletePendingMembershipsForUser: jest.fn(async () => 0),
    } as any;

    publisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => {
        obj.commit = jest.fn();
        return obj;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGroupConversationHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
        { provide: EventPublisher, useValue: publisher },
      ],
    }).compile();

    handler = module.get<CreateGroupConversationHandler>(
      CreateGroupConversationHandler,
    );
  });

  it('throws when the creator already belongs to another group', async () => {
    commandRepo.hasActiveGroupMembership.mockResolvedValue(true);

    await expect(
      handler.execute(new CreateGroupConversationCommand('creator', 'Team')),
    ).rejects.toThrow(UserAlreadyInGroupException);

    expect(commandRepo.hasActiveGroupMembership).toHaveBeenCalledWith(
      'creator',
    );
    expect(commandRepo.saveConversation).not.toHaveBeenCalled();
  });

  it('creates the group and clears other pending join requests', async () => {
    const result = await handler.execute(
      new CreateGroupConversationCommand('creator', 'Team'),
    );

    expect(result).toBeInstanceOf(ConversationEntity);
    expect(result.type).toBe('GROUP');
    expect(commandRepo.saveConversation).toHaveBeenCalledWith(result);
    expect(commandRepo.deletePendingMembershipsForUser).toHaveBeenCalledWith(
      'creator',
      result.id,
      'creator',
    );
    expect(publisher.mergeObjectContext).toHaveBeenCalledWith(result);
  });
});
