import { BaseWsEvent } from '@common/websocket/base-ws-event';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

export interface GroupMemberSummary {
  id: string;
  userId: string;
  username?: string;
  avatarIndex?: number;
  avatar?: string;
  role: ConversationMemberRole;
}

export class GroupJoinRequestedEvent extends BaseWsEvent<GroupJoinRequested> {
  get eventName(): string {
    return 'conversation.group.join.requested';
  }
}

export class GroupJoinRequested {
  conversationId: string;
  userId: string;
  requestedAt: string;
}

export class GroupJoinApprovedEvent extends BaseWsEvent<GroupJoinApproved> {
  get eventName(): string {
    return 'conversation.group.join.approved';
  }
}

export class GroupJoinApproved {
  conversationId: string;
  userId: string;
}

export class GroupJoinRejectedEvent extends BaseWsEvent<GroupJoinRejected> {
  get eventName(): string {
    return 'conversation.group.join.rejected';
  }
}

export class GroupJoinRejected {
  conversationId: string;
  userId: string;
}

export class GroupMemberAddedEvent extends BaseWsEvent<GroupMemberAdded> {
  get eventName(): string {
    return 'conversation.group.member.added';
  }
}

export class GroupMemberAdded {
  conversationId: string;
  userIds: string[];
}

export class GroupMemberRemovedEvent extends BaseWsEvent<GroupMemberRemoved> {
  get eventName(): string {
    return 'conversation.group.member.removed';
  }
}

export class GroupMemberRemoved {
  conversationId: string;
  userId: string;
}

export class GroupMemberRoleChangedEvent extends BaseWsEvent<GroupMemberRoleChanged> {
  get eventName(): string {
    return 'conversation.group.member.role.changed';
  }
}

export class GroupMemberRoleChanged {
  conversationId: string;
  userId: string;
  role: ConversationMemberRole;
}

export class GroupConversationUpdatedEvent extends BaseWsEvent<GroupConversationUpdated> {
  get eventName(): string {
    return 'conversation.group.updated';
  }
}

export class GroupConversationUpdated {
  conversationId: string;
  title: string | null;
  picture: string | null;
  updatedBy: string | null;
}

export class GroupLeftEvent extends BaseWsEvent<GroupLeft> {
  get eventName(): string {
    return 'conversation.group.left';
  }
}

export class GroupLeft {
  conversationId: string;
  userId: string;
}
