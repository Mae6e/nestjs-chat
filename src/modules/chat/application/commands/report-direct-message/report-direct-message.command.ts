export class ReportDirectMessageCommand {
  constructor(
    public readonly reporterId: string,
    public readonly conversationId: string,
    public readonly description: string,
  ) {}
}
