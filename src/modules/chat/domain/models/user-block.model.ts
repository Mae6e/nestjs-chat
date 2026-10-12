import { AggregateRoot } from '@common/domain/aggregate-root';
import { UserBlockedEvent } from '@modules/chat/domain/events/user-blocked.event';
import { UserUnblockedEvent } from '@modules/chat/domain/events/user-unblocked.event';
// import { CannotBlockSelfException } from '@modules/chat/domain/exceptions/cannot-block-self.exception';

export class UserBlockEntity extends AggregateRoot<string> {
  private constructor(
    createdAt: Date,
    updatedAt: Date,
    private readonly _blockerId: string,
    private readonly _blockedId: string,
  ) {
    // AggregateRoot needs an id, so use the composite key
    super(`${_blockerId}:${_blockedId}`, createdAt, updatedAt);
  }

  get blockerId(): string {
    return this._blockerId;
  }

  get blockedId(): string {
    return this._blockedId;
  }

  public static create(blockerId: string, blockedId: string): UserBlockEntity {
    //todo handle self exception
    if (blockerId === blockedId) {
      // throw new CannotBlockSelfException();
    }

    const now = new Date();
    const block = new UserBlockEntity(now, now, blockerId, blockedId);
    block.apply(new UserBlockedEvent(blockerId, blockedId));
    return block;
  }

  public static reconstruct(
    blockerId: string,
    blockedId: string,
    createdAt: Date,
    updatedAt: Date,
  ): UserBlockEntity {
    return new UserBlockEntity(createdAt, updatedAt, blockerId, blockedId);
  }

  // call right before the repository deletes the row
  public markUnblocked(): void {
    this.apply(new UserUnblockedEvent(this._blockerId, this._blockedId));
  }
}
