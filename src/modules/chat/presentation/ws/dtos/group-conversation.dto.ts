import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

export class GroupConversationRequest {
  @IsNotEmpty()
  conversationId: string;
}

export class GroupJoinResponseRequest extends GroupConversationRequest {
  @IsNotEmpty()
  userId: string;
}

export class AddGroupMembersRequest extends GroupConversationRequest {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class ChangeGroupMemberRoleRequest extends GroupJoinResponseRequest {
  @IsNotEmpty()
  @IsEnum(ConversationMemberRole)
  role: ConversationMemberRole;
}

export class GetGroupJoinRequestsRequest extends GroupConversationRequest {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
