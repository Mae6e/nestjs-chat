import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

export class GetUserConversationListRequest {
  @IsOptional()
  @IsNumberString({}, { message: 'userId should be a number string' })
  targetUserId?: string;

  @IsOptional()
  @IsString({ message: 'filter should be a string' })
  filter?: string;

  /**
   * Conversation type to list. Defaults to `DIRECT`.
   * Send `GROUP` to list group chats instead.
   */
  @IsOptional()
  @IsEnum(ConversationType, {
    message: 'type should be either DIRECT or GROUP',
  })
  type?: ConversationType;

  @IsOptional()
  @IsInt({ message: 'page should be an int' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'pageSize should be an int' })
  pageSize?: number;
}

export class UserConversationListItemMessageUser {
  id: string;
  username: string;
}

export class UserConversationListItemMessage {
  id: string;
  text: string;
  seen: boolean;
  createdAt: string;
  user: UserConversationListItemMessageUser;
}

export class UserConversationListItem {
  id: string;
  type: ConversationType;
  role: ConversationMemberRole;
  identifier: string;
  identifierAvatarIndex: number;
  identifierAvatar?: string;
  memberCount: number;
  notSeenCount: number;
  lastMessage: UserConversationListItemMessage;
}
