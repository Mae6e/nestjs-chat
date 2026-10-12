import { Test, TestingModule } from '@nestjs/testing';
import { GetBlockedUsersIdsHandler } from './get-blocked-users-ids.handler';
import { GetBlockedUsersIdsQuery } from './get-blocked-users-ids.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';

describe('GetBlockedUsersIdsHandler', () => {
  let handler: GetBlockedUsersIdsHandler;
  let queryRepo: jest.Mocked<ConversationReadRepositoryPort>;

  beforeEach(async () => {
    queryRepo = {
      getBlockedUserIds: jest.fn(),
    } as unknown as jest.Mocked<ConversationReadRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBlockedUsersIdsHandler,
        {
          provide: ConversationReadRepositoryPort,
          useValue: queryRepo,
        },
      ],
    }).compile();

    handler = module.get<GetBlockedUsersIdsHandler>(GetBlockedUsersIdsHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return the blocked user ids from the repository', async () => {
      const query = new GetBlockedUsersIdsQuery('user-id', [
        'target-1',
        'target-2',
      ]);
      const blockedIds = ['target-1'];

      queryRepo.getBlockedUserIds.mockResolvedValue(blockedIds);

      const result = await handler.execute(query);

      expect(queryRepo.getBlockedUserIds).toHaveBeenCalledWith('user-id', [
        'target-1',
        'target-2',
      ]);
      expect(result).toEqual(blockedIds);
    });
  });
});
