import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

export class GetUserConversationIdsOptions {
  type?: ConversationType;
  status?: ConversationMemberStatus;
}
