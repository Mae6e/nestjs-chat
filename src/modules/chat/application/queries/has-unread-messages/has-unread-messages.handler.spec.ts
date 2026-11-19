import { Test, TestingModule } from '@nestjs/testing';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { HasUnreadMessagesHandler } from './has-unread-messages.handler';
import { HasUnreadMessagesQuery } from './has-unread-messages.query';

describe('HasUnreadMessagesHandler', () => {
  let handler: HasUnreadMessagesHandler;
  let queryRepo: jest.Mocked<ConversationReadRepositoryPort>;

  beforeEach(async () => {
    queryRepo = {
      hasUnreadMessages: jest.fn(),
    } as unknown as jest.Mocked<ConversationReadRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HasUnreadMessagesHandler,
        { provide: ConversationReadRepositoryPort, useValue: queryRepo },
      ],
    }).compile();

    handler = module.get<HasUnreadMessagesHandler>(HasUnreadMessagesHandler);
  });

  it('should return true when the repository reports unread messages', async () => {
    queryRepo.hasUnreadMessages.mockResolvedValue(true);

    const result = await handler.execute(new HasUnreadMessagesQuery('user-1'));

    expect(result).toBe(true);
    expect(queryRepo.hasUnreadMessages).toHaveBeenCalledWith('user-1');
  });

  it('should return false when the repository reports no unread messages', async () => {
    queryRepo.hasUnreadMessages.mockResolvedValue(false);

    const result = await handler.execute(new HasUnreadMessagesQuery('user-1'));

    expect(result).toBe(false);
  });
});
