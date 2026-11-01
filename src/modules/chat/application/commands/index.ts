import { CreateDirectConversationHandler } from './create-direct-conversation/create-direct-conversation.handler';
import { CreateGroupConversationHandler } from './create-group-conversation/create-group-conversation.handler';
import { CreateMessageHandler } from './create-message/create-message.handler';
import { DeleteConversationHandler } from './delete-conversation/delete-conversation.handler';
import { MarkConversationAsReadCommandHandler } from './mark-conversation-as-read/mark-conversation-as-read.handler';
import { BlockUserHandler } from '../../../chat/application/commands/block-user/block-user.handler';
import { UnblockUserHandler } from '../../../chat/application/commands/unblock-user/unblock-user.handler';
import { RequestJoinGroupHandler } from './request-join-group/request-join-group.handler';
import { RespondToJoinRequestHandler } from './respond-to-join-request/respond-to-join-request.handler';
import { AddGroupMembersHandler } from './add-group-members/add-group-members.handler';
import { RemoveGroupMemberHandler } from './remove-group-member/remove-group-member.handler';
import { ChangeGroupMemberRoleHandler } from './change-group-member-role/change-group-member-role.handler';
import { UpdateGroupConversationHandler } from './update-group-conversation/update-group-conversation.handler';
import { LeaveGroupHandler } from './leave-group/leave-group.handler';

export const CommandHandlers = [
  CreateDirectConversationHandler,
  CreateGroupConversationHandler,
  CreateMessageHandler,
  DeleteConversationHandler,
  MarkConversationAsReadCommandHandler,
  BlockUserHandler,
  UnblockUserHandler,
  RequestJoinGroupHandler,
  RespondToJoinRequestHandler,
  AddGroupMembersHandler,
  RemoveGroupMemberHandler,
  ChangeGroupMemberRoleHandler,
  UpdateGroupConversationHandler,
  LeaveGroupHandler,
];
