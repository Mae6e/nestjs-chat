import { IsInt, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class GetUserConversationListRequest {
  @IsNotEmpty()
  @IsNumberString({}, { message: 'userId should be a number string' })
  targetUserId: string;

  @IsNotEmpty()
  @IsString({ message: 'filter should be a string' })
  filter: string;

  @IsNotEmpty()
  @IsInt({ message: 'page should be an int' })
  page: number;

  @IsNotEmpty()
  @IsInt({ message: 'pageSize should be an int' })
  pageSize: number;
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
  identifier: string;
  identifierAvatarIndex: number;
  identifierAvatar?: string;
  notSeenCount: number;
  lastMessage: UserConversationListItemMessage;
}
