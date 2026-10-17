import { Test, TestingModule } from '@nestjs/testing';
import { BlockUserHandler } from './block-user.handler';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { EventPublisher } from '@nestjs/cqrs';
import { BlockUserCommand } from './block-user.command';
import { UserNotFoundException } from '@modules/chat/domain/chat.exceptions';

describe('BlockUserHandler', () => {
  let handler: BlockUserHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;
  let publisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    commandRepo = {
      getUserById: jest.fn(),
      block: jest.fn(),
      getBlockStatus: jest.fn(),
    } as any;

    publisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => {
        obj.commit = jest.fn();
        obj.apply = jest.fn();
        return obj;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockUserHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
        { provide: EventPublisher, useValue: publisher },
      ],
    }).compile();

    handler = module.get<BlockUserHandler>(BlockUserHandler);
  });

  //todo user block test

  // it('should throw UserNotFoundException if blocker is not found', async () => {
  //   commandRepo.getUserById.mockResolvedValueOnce(null);
  //   const command = new BlockUserCommand('blocker-1', 'blocked-1');

  //   await expect(handler.execute(command)).rejects.toThrow(
  //     UserNotFoundException,
  //   );
  //   expect(commandRepo.getUserById).toHaveBeenCalledWith('blocker-1');
  // });

  // it('should throw UserNotFoundException if blocked user is not found', async () => {
  //   commandRepo.getUserById
  //     .mockResolvedValueOnce({} as any)
  //     .mockResolvedValueOnce(null);
  //   const command = new BlockUserCommand('blocker-1', 'blocked-1');

  //   await expect(handler.execute(command)).rejects.toThrow(
  //     UserNotFoundException,
  //   );
  //   expect(commandRepo.getUserById).toHaveBeenCalledWith('blocked-1');
  // });

  //it('should successfully block user', async () => {
  // const blocker = UserEntity.create('blocker@test.com', 'blocker');
  // const blocked = UserEntity.create('blocked@test.com', 'blocked');

  //   userRepository.getUserById
  //     .mockResolvedValueOnce(blocker)
  //     .mockResolvedValueOnce(blocked);
  //   userRepository.getBlockStatus.mockResolvedValueOnce(false);

  //   const command = new BlockUserCommand(blocker.id, blocked.id);
  //   const result = await handler.execute(command);

  //   expect(result).toBe(true);
  //   expect(userRepository.block).toHaveBeenCalledWith(blocker.id, blocked.id);
  //   expect(publisher.mergeObjectContext).toHaveBeenCalledWith(blocker);
  //   expect((blocker as any).commit).toHaveBeenCalled();
  // });
});
