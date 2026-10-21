import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { PaginationOptions } from '@common/pagination/pagination.interface';

export class GetUserConversationListOptions {
  type?: ConversationType;
  filterUserIds?: string[];
  titleSearch?: string;
  withLastMessage?: boolean;
  pagination: PaginationOptions;
}
