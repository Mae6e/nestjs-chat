import { GetUserConversationListHandler } from './get-user-conversation-list/get-user-conversation-list.handler';
import { GetUserConversationIdsHandler } from './get-user-conversation-ids/get-user-conversation-ids.handler';
import { GetUserConversationHandler } from './get-user-conversation/get-user-conversation.handler';
import { GetUserConversationMessageListHandler } from './get-user-conversation-message-list/get-user-conversation-message-list.handler';
import { GetBlockedUsersIdsHandler } from './get-blocked-users-ids/get-blocked-users-ids.handler';
import { GetBlockStatusHandler } from './get-block-status/get-block-status.handler';

export const QueryHandlers = [
  GetUserConversationListHandler,
  GetUserConversationIdsHandler,
  GetUserConversationHandler,
  GetUserConversationMessageListHandler,
  GetBlockStatusHandler,
  GetBlockedUsersIdsHandler,
];
