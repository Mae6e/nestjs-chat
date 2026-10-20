export class RequestJoinGroupCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}
