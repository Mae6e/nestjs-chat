import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

export class ChangeGroupMemberRoleCommand {
  constructor(
    public readonly conversationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
    public readonly role: ConversationMemberRole,
  ) {}
}
