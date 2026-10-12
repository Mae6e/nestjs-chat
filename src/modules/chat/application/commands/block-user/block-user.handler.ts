import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { BlockUserCommand } from './block-user.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { UserNotFoundException } from '@modules/chat/domain/chat.exceptions';
import { UserBlockedEvent } from '@modules/chat/domain/events/user-blocked.event';

@CommandHandler(BlockUserCommand)
export class BlockUserHandler implements ICommandHandler<
  BlockUserCommand,
  boolean
> {
  private readonly logger = new Logger(BlockUserHandler.name);

  constructor(
    private readonly commandRepo: ConversationRepositoryPort,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: BlockUserCommand): Promise<boolean> {
    this.logger.debug(
      `User ${command.blockerId} is blocking ${command.blockedId}`,
    );

    // const blockerRes = await this.userRepository.getUserById(command.blockerId);
    // if (!blockerRes) throw new UserNotFoundException(command.blockerId);

    // const blockedRes = await this.userRepository.getUserById(command.blockedId);
    // if (!blockedRes) throw new UserNotFoundException(command.blockedId);

    //todo check validation of users

    const isBlocked = await this.commandRepo.getBlockStatus(
      command.blockerId,
      command.blockedId,
    );

    if (isBlocked) {
      this.logger.log(
        `User ${command.blockerId} has already blocked user ${command.blockedId}`,
      );
      return false;
    }

    await this.commandRepo.block(command.blockerId, command.blockedId);

    // const blocker = this.publisher.mergeObjectContext(blockerRes);
    // blocker.apply(new UserBlockedEvent(command.blockerId, command.blockedId));
    // blocker.commit();
    //todo commit after check validation of users

    return true;
  }
}
