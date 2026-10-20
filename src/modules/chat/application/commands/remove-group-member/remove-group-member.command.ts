export class RemoveGroupMemberCommand {
  constructor(
    public readonly conversationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
  ) {}
}
