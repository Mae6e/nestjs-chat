export enum GroupJoinRequestAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class RespondToJoinRequestCommand {
  constructor(
    public readonly conversationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
    public readonly action: GroupJoinRequestAction,
  ) {}
}
