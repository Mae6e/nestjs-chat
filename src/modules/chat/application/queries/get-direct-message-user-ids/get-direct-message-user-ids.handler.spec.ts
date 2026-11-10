import { Test, TestingModule } from '@nestjs/testing';
import { GetDirectMessageUserIdsHandler } from './get-direct-message-user-ids.handler';
import { GetDirectMessageUserIdsQuery } from './get-direct-message-user-ids.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';

describe('GetDirectMessageUserIdsHandler', () => {
  let handler: GetDirectMessageUserIdsHandler;
  let queryRepo: jest.Mocked<ConversationReadRepositoryPort>;

  beforeEach(async () => {
    queryRepo = {
      getDirectMessageUserIds: jest.fn(),
    } as unknown as jest.Mocked<ConversationReadRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDirectMessageUserIdsHandler,
        {
          provide: ConversationReadRepositoryPort,
          useValue: queryRepo,
        },
      ],
    }).compile();

    handler = module.get<GetDirectMessageUserIdsHandler>(
      GetDirectMessageUserIdsHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return the ids of users the user has direct messages with', async () => {
      const userIds = ['user-2', 'user-3'];
      queryRepo.getDirectMessageUserIds.mockResolvedValue(userIds);

      const result = await handler.execute(
        new GetDirectMessageUserIdsQuery('user-1'),
      );

      expect(queryRepo.getDirectMessageUserIds).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(userIds);
    });
  });
});
