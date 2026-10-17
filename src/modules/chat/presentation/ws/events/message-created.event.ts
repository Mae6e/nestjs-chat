import { BaseWsEvent } from '@common/websocket/base-ws-event';

export class UserMessageCreatedEvent extends BaseWsEvent<UserMessageCreated> {
  get eventName(): string {
    return 'conversation.message.sent';
  }
}

export class UserMessageCreated {
  id: string;
  content: string;
  seen: boolean;
  conversation: UserMessageCreatedConversation;
  createdAt: string;
  user: UserMessageCreatedUser;
}

export class UserMessageCreatedConversation {
  id: string;
}

export class UserMessageCreatedUser {
  id: string;
  username: string;
  avatarIndex: number;
  avatar?: string;
}
