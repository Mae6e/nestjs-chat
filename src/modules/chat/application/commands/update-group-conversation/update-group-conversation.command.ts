export class UpdateGroupConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly actorId: string,
    public readonly title?: string,
    public readonly picture?: string | null,
  ) {}
}
