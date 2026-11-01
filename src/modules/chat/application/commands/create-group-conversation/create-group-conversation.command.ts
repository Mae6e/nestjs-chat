export class CreateGroupConversationCommand {
  constructor(
    public readonly creatorId: string,
    public readonly title: string,
    public readonly picture: string | null = null,
    public readonly description: string | null = null,
  ) {}
}
