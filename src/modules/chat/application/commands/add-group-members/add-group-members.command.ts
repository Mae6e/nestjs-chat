export class AddGroupMembersCommand {
  constructor(
    public readonly conversationId: string,
    public readonly actorId: string,
    public readonly userIds: string[],
  ) {}
}
