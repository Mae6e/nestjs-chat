import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

export interface ConversationMemberReadDto {
  id: string;
  userId: string;
  role: ConversationMemberRole;
  status: ConversationMemberStatus;
  lastSeenMessageId: string | null;
  lastSeenMessage: { createdAt: string } | null;
  lastMessageId: string | null;
}

export interface ConversationReadDto {
  id: string;
  type: string;
  identifier: string | null;
  title: string | null;
  picture: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMemberReadDto[];
  lastMessage: MessageReadDto | null;
  notSeenCount: number;
}

export interface GroupConversationListItemReadDto {
  id: string;
  type: string;
  title: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  createdByMe: boolean;
  notSeenCount: number;
}
