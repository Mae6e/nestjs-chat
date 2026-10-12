import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { UnblockUserCommand } from './unblock-user.command';
import { Logger } from '@nestjs/common';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { UserNotFoundException } from '@modules/chat/domain/chat.exceptions';
import { UserUnblockedEvent } from '@modules/chat/domain/events/user-unblocked.event';

@CommandHandler(UnblockUserCommand)
export class UnblockUserHandler implements ICommandHandler<
  UnblockUserCommand,
  boolean
> {
  private readonly logger = new Logger(UnblockUserHandler.name);

  constructor(
    private readonly commandRepo: ConversationRepositoryPort,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: UnblockUserCommand): Promise<boolean> {
    this.logger.debug(
      `User ${command.unblockerId} is unblocking ${command.unblockedId}`,
    );

    // const unblockerRes = await this.commandRepo.getUserById(
    //   command.unblockerId,
    // );
    // if (!unblockerRes) throw new UserNotFoundException(command.unblockerId);
    //todo check validation of users

    const isBlocked = await this.commandRepo.getBlockStatus(
      command.unblockerId,
      command.unblockedId,
    );

    if (!isBlocked) {
      this.logger.log(
        `User ${command.unblockedId} was not blocked by ${command.unblockerId}`,
      );
      return false;
    }

    await this.commandRepo.unblock(command.unblockerId, command.unblockedId);

    // const unblocker = this.publisher.mergeObjectContext(unblockerRes);
    // unblocker.apply(
    //   new UserUnblockedEvent(command.unblockerId, command.unblockedId),
    // );
    // unblocker.commit();

    //todo commit after check validation of users

    return true;
  }
}
