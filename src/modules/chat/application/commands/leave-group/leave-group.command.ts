export class LeaveGroupCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}
