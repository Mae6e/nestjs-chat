export class GetGroupMembersQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}
