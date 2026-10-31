import { CreateDirectConversationCommand } from '@modules/chat/application/commands/create-direct-conversation/create-direct-conversation.command';
import { CreateMessageCommand } from '@modules/chat/application/commands/create-message/create-message.command';
import { DeleteConversationCommand } from '@modules/chat/application/commands/delete-conversation/delete-conversation.command';
import { RequestJoinGroupCommand } from '@modules/chat/application/commands/request-join-group/request-join-group.command';
import {
  GroupJoinRequestAction,
  RespondToJoinRequestCommand,
} from '@modules/chat/application/commands/respond-to-join-request/respond-to-join-request.command';
import { AddGroupMembersCommand } from '@modules/chat/application/commands/add-group-members/add-group-members.command';
import { RemoveGroupMemberCommand } from '@modules/chat/application/commands/remove-group-member/remove-group-member.command';
import { ChangeGroupMemberRoleCommand } from '@modules/chat/application/commands/change-group-member-role/change-group-member-role.command';
import { LeaveGroupCommand } from '@modules/chat/application/commands/leave-group/leave-group.command';
import { GetUserConversationListQuery } from '@modules/chat/application/queries/get-user-conversation-list/get-user-conversation-list.query';
import { GetUserConversationQuery } from '@modules/chat/application/queries/get-user-conversation/get-user-conversation.query';
import { GetUserConversationMessageListQuery } from '@modules/chat/application/queries/get-user-conversation-message-list/get-user-conversation-message-list.query';
import { GetGroupMembersQuery } from '@modules/chat/application/queries/get-group-members/get-group-members.query';
import { GetGroupJoinRequestsQuery } from '@modules/chat/application/queries/get-group-join-requests/get-group-join-requests.query';
import { GetUserConversationIdsQuery } from '@modules/chat/application/queries/get-user-conversation-ids/get-user-conversation-ids.query';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatWsGuard } from '@modules/chat/presentation/ws/guards/chat-ws.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetUserConversationListRequest,
  UserConversationListItem,
} from '@modules/chat/presentation/ws/dtos/get-user-conversation-list.dto';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { CreateConversationRequest } from '@modules/chat/presentation/ws/dtos/create-conversation.dto';
import { MessageType } from '@modules/chat/domain/enums/chat-type.enum';
import { BaseWsGateway } from '@common/websocket/base-ws.gateway';
import { ConversationCreatedEvent } from '@modules/chat/presentation/ws/events/conversation-created.event';
import { CreateMessageRequest } from '@modules/chat/presentation/ws/dtos/create-message.dto';
import { MarkConversationAsReadCommand } from '@modules/chat/application/commands/mark-conversation-as-read/mark-conversation-as-read.command';
import { GetConversationMessageListRequest } from '@modules/chat/presentation/ws/dtos/get-conversation-message-list.dto';
import { MessageSeenEvent } from '@modules/chat/presentation/ws/events/message-seen.event';
import { MarkMessageSeenRequest } from '@modules/chat/presentation/ws/dtos/mark-message-seen.dto';
import { GlobalWsExceptionFilter } from '@common/websocket/filters/global-ws-exception.filter';
import {
  AddGroupMembersRequest,
  ChangeGroupMemberRoleRequest,
  GetGroupJoinRequestsRequest,
  GroupConversationRequest,
  GroupJoinResponseRequest,
} from '@modules/chat/presentation/ws/dtos/group-conversation.dto';
import {
  GroupJoinApprovedEvent,
  GroupJoinRejectedEvent,
  GroupJoinRequestedEvent,
  GroupLeftEvent,
  GroupMemberAddedEvent,
  GroupMemberRemovedEvent,
  GroupMemberRoleChangedEvent,
} from '@modules/chat/presentation/ws/events/group.events';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { FileStoragePort } from '@modules/chat/application/ports/file-storage.port';
import { ChatUser } from '@modules/chat/application/ports/user-integration.port';
import { DomainException } from '@common/exceptions/domain.exception';

@UseGuards(ChatWsGuard)
@UseFilters(new GlobalWsExceptionFilter())
@WebSocketGateway({ namespace: 'chat', cors: '*' })
export class ChatWsGateway
  extends BaseWsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatWsGateway.name);

  constructor(
    private readonly chatWsGuard: ChatWsGuard,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly userIntegrationPort: UserIntegrationPort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly fileStorage: FileStoragePort,
  ) {
    super();
  }

  getLogger(): Logger {
    return this.logger;
  }

  afterInit() {
    this.logger.debug('Conversation gateway initialized successfully.');
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`New client connected. id: ${client.id}`);

    if (!client.data['authPromise']) {
      client.data['authPromise'] = this.chatWsGuard.authenticateUser(client);
    }

    try {
      const authPayload = await client.data['authPromise'];

      const rooms = [`user-${authPayload.sub}`];

      // Join the rooms of the user's active groups so group-scoped events can
      // be delivered with a single conversation-room broadcast.
      try {
        const groupConversationIds = await this.queryBus.execute(
          new GetUserConversationIdsQuery(authPayload.sub, {
            type: ConversationType.GROUP,
            status: ConversationMemberStatus.ACTIVE,
          }),
        );

        rooms.push(
          ...(groupConversationIds ?? []).map(
            (conversationId: string) => `conversation-${conversationId}`,
          ),
        );
      } catch (e) {
        // A room-sync failure must not prevent the client from connecting.
        this.logger.error(
          `Failed to load group rooms for user ${authPayload.sub}: ${(e as Error).message}`,
        );
      }

      this.logger.debug(
        `Joining user ${authPayload.sub} to rooms ${rooms.join(', ')}`,
      );
      client.join(rooms);

      this.logger.log(`Client authorized: ${authPayload.sub}`);
      client.emit('ready');
    } catch (e) {
      this.logger.debug(
        `Error during connection: ${(e as Error).message}. disconnecting...`,
      );
      client.emit('error.client', (e as Error).message);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const authUser = client.data?.user;
    if (authUser) {
      this.logger.log(`Client disconnected: ${authUser}`);
    } else {
      this.logger.debug(`Unknown client ${client.id} disconnected`);
    }
  }

  private conversationRoom(conversationId: string): string {
    return `conversation-${conversationId}`;
  }

  /**
   * Adds every socket of the user (all devices/tabs) to the conversation room.
   *
   * Also used by the HTTP group-creation endpoint, which creates the
   * conversation after the creator's sockets have already connected.
   */
  async joinConversationRoom(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.server) {
      return;
    }

    await this.server
      .in(`user-${userId}`)
      .socketsJoin(this.conversationRoom(conversationId));
  }

  /**
   * Removes every socket of the user from the conversation room.
   */
  async leaveConversationRoom(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.server) {
      return;
    }

    await this.server
      .in(`user-${userId}`)
      .socketsLeave(this.conversationRoom(conversationId));
  }

  @SubscribeMessage('conversation.create')
  async createDirectConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateConversationRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const users = await this.userIntegrationPort.getUsersByIds([
      authUserId,
      data.targetUserId,
    ]);

    const currentUser = users.find((u) => u.id === authUserId);
    const targetUser = users.find((u) => u.id === data.targetUserId);

    if (!currentUser || !targetUser) {
      throw new WsException('User not found.');
    }

    const blockStatus = await this.userIntegrationPort.getBlockStatus(
      authUserId,
      targetUser.id,
    );
    if (blockStatus.isBlocker) {
      throw new WsException('You have blocked this user.');
    }

    const createConversation = await this.commandBus.execute(
      new CreateDirectConversationCommand(currentUser.id, data.targetUserId),
    );

    let createMessage;
    try {
      createMessage = await this.commandBus.execute(
        new CreateMessageCommand(
          data.content,
          MessageType.TEXT,
          currentUser.id,
          createConversation.id,
          blockStatus.isBlocked ? [targetUser.id] : [],
        ),
      );
    } catch (e) {
      await this.commandBus.execute(
        new DeleteConversationCommand(createConversation.id),
      );
      throw e;
    }

    if (!createMessage.deletedForUserIds.includes(targetUser.id)) {
      await this.broadcast(
        client,
        [`user-${targetUser.id}`],
        new ConversationCreatedEvent({
          id: createMessage.conversationId,
          avatarIndex: currentUser.avatarIndex,
          avatar: currentUser.avatar,
          username: currentUser.username,
          notSeenCount: 1,
          lastMessage: {
            id: createMessage.id,
            content: createMessage.text,
            createdAt: createMessage.createdAt.toISOString(),
            seen: false,
            user: {
              id: currentUser.id,
              username: currentUser.username,
            },
          },
        }),
      );
    }

    // Broadcast to sender's other devices/tabs
    await this.broadcast(
      client,
      [`user-${currentUser.id}`],
      new ConversationCreatedEvent({
        id: createMessage.conversationId,
        avatarIndex: currentUser.avatarIndex,
        avatar: targetUser.avatar,
        username: targetUser.username,
        notSeenCount: 0,
        lastMessage: {
          id: createMessage.id,
          content: createMessage.text,
          createdAt: createMessage.createdAt.toISOString(),
          seen: true,
          user: {
            id: currentUser.id,
            username: currentUser.username,
          },
        },
      }),
    );

    //? ack message
    return {
      id: createConversation.id,
      username: targetUser.username,
      createdAt: createMessage.createdAt.toISOString(),
      avatarIndex: targetUser.avatarIndex,
      avatar: targetUser.avatar,
      chat: {
        id: createMessage.id,
        createdAt: createMessage.createdAt.toISOString(),
        seen: false,
        content: createMessage.text,
        user: {
          id: currentUser.id,
          username: currentUser.username,
        },
      },
    };
  }

  @SubscribeMessage('conversation.list')
  async getUserConversationList(
    @MessageBody() data: GetUserConversationListRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const pagination = PaginationHelper.parse(data.page, data.pageSize);

    const filterText = data.filter?.trim();
    let filteredUserIds: string[] = [];
    if (filterText) {
      filteredUserIds =
        await this.userIntegrationPort.getUserIdsByNameOrUsername(filterText);
    }

    if (data.targetUserId) {
      filteredUserIds.push(data.targetUserId);
    }

    // A filter that only contains whitespace cannot match a title or a user.
    if (data.filter && !filterText && filteredUserIds.length === 0) {
      return PaginationHelper.createResult([], 0, pagination);
    }

    const conversationList = await this.queryBus.execute(
      new GetUserConversationListQuery(authUserId, {
        pagination,
        // Direct chats are listed by default; send `type: 'GROUP'` to list
        // group chats instead.
        type: data.type ?? ConversationType.DIRECT,
        filterUserIds: filteredUserIds.filter(
          (userId) => userId && userId !== authUserId,
        ),
        titleSearch: filterText || undefined,
        withLastMessage: true,
      }),
    );

    const conversationsUserIds = conversationList.data
      .map((c) => c.lastMessage?.senderId)
      .filter((id) => id != null);
    const allUsersInvolved = conversationList.data.flatMap((c) =>
      c.members.map((m) => m.userId),
    );
    allUsersInvolved.push(...conversationsUserIds);
    const uniqueUserIds = Array.from(new Set(allUsersInvolved)) as string[];

    const users =
      uniqueUserIds.length > 0
        ? await this.userIntegrationPort.getUsersByIds(uniqueUserIds)
        : [];
    const usersById = new Map(users.map((u) => [u.id, u]));

    const isSeenBy = (member: any, messageCreatedAt: Date) =>
      !!member?.lastSeenMessage &&
      messageCreatedAt <= member.lastSeenMessage.createdAt;

    return {
      meta: conversationList.meta,
      data: conversationList.data.map((item) => {
        const currentMember = item.members.find((m) => m.userId == authUserId);

        const otherMembers = item.members.filter(
          (m) => m.userId !== authUserId,
        );
        const otherMember = otherMembers[0];
        const isDirect = item.type === ConversationType.DIRECT;

        const conversation: UserConversationListItem = {
          id: item.id,
          type: item.type,
          role: currentMember?.role ?? ConversationMemberRole.USER,
          identifier: item.identifier,
          identifierAvatarIndex: 0,
          identifierAvatar: undefined,
          memberCount: item.members.length,
          lastMessage: null,
          notSeenCount: item?.notSeenCount ?? 0,
        };

        if (isDirect && otherMember) {
          const otherUser = usersById.get(otherMember.userId);
          if (otherUser) {
            conversation.identifier = otherUser.username;
            conversation.identifierAvatarIndex = otherUser.avatarIndex;
            conversation.identifierAvatar = otherUser.avatar;
          }
        } else if (!isDirect) {
          conversation.identifier = item.title ?? item.identifier ?? '';
          conversation.identifierAvatar =
            this.fileStorage.getGroupPictureUrl(item.picture) ?? undefined;
        }

        if (item.lastMessage) {
          const sender = usersById.get(item.lastMessage.senderId);
          const isOwn = item.lastMessage.senderId === authUserId;

          const seen = isOwn
            ? isDirect
              ? isSeenBy(otherMember, item.lastMessage.createdAt)
              : otherMembers.length > 0 &&
                otherMembers.every((m) =>
                  isSeenBy(m, item.lastMessage.createdAt),
                )
            : isSeenBy(currentMember, item.lastMessage.createdAt);

          conversation.lastMessage = {
            id: item.lastMessage.id,
            text: item.lastMessage.text,
            createdAt: item.lastMessage.createdAt,
            seen,
            user: sender
              ? {
                  id: sender.id,
                  username: sender.username,
                }
              : null,
          };
        }
        return conversation;
      }),
    };
  }

  @SubscribeMessage('conversation.message.send')
  async createMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const conversation = await this.queryBus.execute(
      new GetUserConversationQuery(data.conversationId, authUserId),
    );

    const isDirect = conversation.type === ConversationType.DIRECT;

    let currentUser: ChatUser;
    let targetUser: ChatUser | undefined;
    let deletedForUserIds: string[] = [];

    if (isDirect) {
      const targetMember = conversation.members.find(
        (member) => member.userId !== authUserId,
      );
      if (!targetMember) {
        throw new WsException('Conversation not found');
      }

      const users = await this.userIntegrationPort.getUsersByIds([
        authUserId,
        targetMember.userId,
      ]);

      currentUser = users.find((u) => u.id === authUserId);
      targetUser = users.find((u) => u.id === targetMember.userId);

      if (!currentUser || !targetUser) {
        throw new WsException('User not found.');
      }

      const blockStatus = await this.userIntegrationPort.getBlockStatus(
        authUserId,
        targetMember.userId,
      );

      if (blockStatus.isBlocker) {
        throw new WsException(
          'You need to unblock the user before sending a message.',
        );
      }

      deletedForUserIds = blockStatus.isBlocked ? [targetUser.id] : [];
    } else {
      const users = await this.userIntegrationPort.getUsersByIds([authUserId]);
      currentUser = users.find((u) => u.id === authUserId);

      if (!currentUser) {
        throw new WsException('User not found.');
      }
    }

    const createMessage = await this.commandBus.execute(
      new CreateMessageCommand(
        data.text,
        MessageType.TEXT,
        authUserId,
        conversation.id,
        deletedForUserIds,
      ),
    );

    return {
      id: createMessage.id,
      conversationId: conversation.id,
      createdAt: createMessage.createdAt.toISOString(),
      seen: false,
      user: {
        id: currentUser.id,
        username: currentUser.username,
      },
      content: createMessage.text,
    };
  }

  @SubscribeMessage('conversation.message.list')
  async getConversationMessageList(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetConversationMessageListRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const conversation = await this.queryBus.execute(
      new GetUserConversationQuery(data.conversationId, authUserId),
    );

    const pagination = PaginationHelper.parse(data.page, data.pageSize);

    const messageList = await this.queryBus.execute(
      new GetUserConversationMessageListQuery(
        data.conversationId,
        authUserId,
        pagination,
      ),
    );

    let userIds = messageList.data.map((message) => message.senderId);
    userIds.push(...conversation.members.map((member) => member.userId));
    userIds = Array.from(new Set(userIds));

    const users = await this.userIntegrationPort.getUsersByIds(userIds);

    const blockedUserIds = await this.userIntegrationPort.getBlockedUsersIds(
      authUserId,
      users.map((user) => user.id),
    );

    const isDirect = conversation.type === ConversationType.DIRECT;
    const otherMembers = conversation.members.filter(
      (m) => m.userId !== authUserId,
    );
    const otherMember = otherMembers[0];

    const me = conversation.members.find((m) => m.userId === authUserId);
    const myLastSeenAt = me?.lastSeenMessage?.createdAt;

    const isSeenByEveryone = (createdAt: string | Date): boolean => {
      if (isDirect) {
        return (
          !!otherMember?.lastSeenMessage &&
          createdAt <= otherMember.lastSeenMessage.createdAt
        );
      }
      return (
        otherMembers.length > 0 &&
        otherMembers.every(
          (member) =>
            !!member.lastSeenMessage &&
            createdAt <= member.lastSeenMessage.createdAt,
        )
      );
    };

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title ?? null,
      picture: this.fileStorage.getGroupPictureUrl(conversation.picture),
      updatedBy: conversation.updatedBy ?? null,
      role: me?.role ?? ConversationMemberRole.USER,
      members: users
        .filter((user) => user.id != authUserId)
        .map((m) => ({
          id: m.id,
          username: m.username,
          avatarIndex: m.avatarIndex,
          avatar: m.avatar,
          role: conversation.members.find((cm) => cm.userId === m.id)?.role,
          isBlocked: blockedUserIds.includes(m.id),
        })),
      messages: {
        total: messageList.meta.total,
        page: messageList.meta.page,
        pageSize: messageList.meta.pageSize,
        list: messageList.data.map((item) => {
          const user = users.find((u) => u.id == item.senderId);
          const isOwn = item.senderId === authUserId;

          const seen = isOwn
            ? isSeenByEveryone(item.createdAt)
            : !!myLastSeenAt && item.createdAt <= myLastSeenAt;

          const message = {
            id: item.id,
            content: item.text,
            createdAt: item.createdAt,
            seen,
            user: user
              ? {
                  id: user.id,
                  username: user.username,
                }
              : null,
          };

          return message;
        }),
      },
    };
  }

  @SubscribeMessage('conversation.message.markSeen')
  async markMessageAsSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkMessageSeenRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<void> {
    const conversation = await this.queryBus.execute(
      new GetUserConversationQuery(data.conversationId, authUserId),
    );

    // Verify user is a member of the conversation
    const isMember = conversation.members.some((m) => m.userId === authUserId);
    if (!isMember) {
      throw new WsException('Conversation not found or access denied');
    }

    // Execute the command to update the read status in the DB
    await this.commandBus.execute(
      new MarkConversationAsReadCommand(
        conversation.id,
        authUserId,
        data.messageId,
      ),
    );

    // Group read receipts fan out through the conversation room; direct
    // conversations keep using per-user rooms.
    const recipientRooms =
      conversation.type === ConversationType.GROUP
        ? [this.conversationRoom(conversation.id)]
        : conversation.members.map((member) => `user-${member.userId}`);

    await this.broadcast(
      client,
      recipientRooms,
      new MessageSeenEvent({
        conversationId: conversation.id,
        messageId: data.messageId,
      }),
    );
  }

  //todo: Group conversations

  @SubscribeMessage('conversation.group.join')
  async requestToJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GroupConversationRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    try {
      const member = await this.commandBus.execute(
        new RequestJoinGroupCommand(data.conversationId, authUserId),
      );

      const conversation =
        await this.conversationRepository.getConversationById(
          data.conversationId,
        );

      if (conversation) {
        const adminRooms = conversation
          .getAdmins()
          .filter((admin) => admin.userId !== authUserId)
          .map((admin) => `user-${admin.userId}`);

        await this.broadcast(
          client,
          adminRooms,
          new GroupJoinRequestedEvent({
            conversationId: data.conversationId,
            userId: authUserId,
            requestedAt: new Date().toISOString(),
          }),
        );
      }

      return {
        conversationId: data.conversationId,
        status: member.status,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        return { status: 'error', code: error.code, message: error.message };
      }
      throw error;
    }
  }

  @SubscribeMessage('conversation.group.join.requests')
  async getGroupJoinRequests(
    @MessageBody() data: GetGroupJoinRequestsRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const pagination = PaginationHelper.parse(data.page, data.pageSize);

    const requests = await this.queryBus.execute(
      new GetGroupJoinRequestsQuery(
        data.conversationId,
        authUserId,
        pagination,
      ),
    );

    let result = [];
    if (requests && requests.data?.length) {
      const users = await this.userIntegrationPort.getUsersByIds(
        requests.data.map((request) => request.userId),
      );

      const usersById = new Map(users.map((user) => [user.id, user]));
      result = requests.data.map((request) => {
        const user = usersById.get(request.userId);
        return {
          id: request.id,
          userId: request.userId,
          username: user?.username,
          avatarIndex: user?.avatarIndex,
          avatar: user?.avatar,
          role: request.role,
          status: request.status,
          updatedBy: request.updatedBy,
        };
      });
    }

    return {
      meta: requests.meta,
      data: result,
    };
  }

  @SubscribeMessage('conversation.group.join.approve')
  async approveGroupJoinRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GroupJoinResponseRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    return this.respondToGroupJoinRequest(
      client,
      data,
      authUserId,
      GroupJoinRequestAction.APPROVE,
    );
  }

  @SubscribeMessage('conversation.group.join.reject')
  async rejectGroupJoinRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GroupJoinResponseRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    return this.respondToGroupJoinRequest(
      client,
      data,
      authUserId,
      GroupJoinRequestAction.REJECT,
    );
  }

  private async respondToGroupJoinRequest(
    client: Socket,
    data: GroupJoinResponseRequest,
    authUserId: string,
    action: GroupJoinRequestAction,
  ): Promise<any> {
    const member = await this.commandBus.execute(
      new RespondToJoinRequestCommand(
        data.conversationId,
        authUserId,
        data.userId,
        action,
      ),
    );

    const isApprove = action === GroupJoinRequestAction.APPROVE;

    if (isApprove) {
      // The approved user was not a member before, so add all of their
      // sockets to the conversation room before broadcasting.
      await this.joinConversationRoom(data.userId, data.conversationId);

      await this.broadcast(
        client,
        [this.conversationRoom(data.conversationId)],
        new GroupJoinApprovedEvent({
          conversationId: data.conversationId,
          userId: data.userId,
        }),
      );
    } else {
      await this.broadcast(
        client,
        [`user-${data.userId}`],
        new GroupJoinRejectedEvent({
          conversationId: data.conversationId,
          userId: data.userId,
        }),
      );
    }

    return {
      conversationId: data.conversationId,
      userId: data.userId,
      status: member.status,
    };
  }

  //! didnot test that
  @SubscribeMessage('conversation.group.member.add')
  async addGroupMembers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AddGroupMembersRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const added = await this.commandBus.execute(
      new AddGroupMembersCommand(
        data.conversationId,
        authUserId,
        data.userIds ?? [],
      ),
    );

    // Added users may be online; join all of their sockets to the room so they
    // receive this event and future group events.
    await Promise.all(
      added.map((member) =>
        this.joinConversationRoom(member.userId, data.conversationId),
      ),
    );

    await this.broadcast(
      client,
      [
        this.conversationRoom(data.conversationId),
        // Same `socketsJoin` race as in the approve flow: also send to the
        // added users' personal rooms.
        ...added.map((member) => `user-${member.userId}`),
      ],
      new GroupMemberAddedEvent({
        conversationId: data.conversationId,
        userIds: added.map((member) => member.userId),
      }),
    );

    return {
      conversationId: data.conversationId,
      userIds: added.map((member) => member.userId),
    };
  }

  @SubscribeMessage('conversation.group.member.remove')
  async removeGroupMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GroupJoinResponseRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const conversationBefore =
      await this.conversationRepository.getConversationById(
        data.conversationId,
      );

    await this.commandBus.execute(
      new RemoveGroupMemberCommand(
        data.conversationId,
        authUserId,
        data.userId,
      ),
    );

    // Let the removed user know first (their personal room guarantees delivery
    // even if they were already dropped from the conversation room), then take
    // their sockets out of the room so later messages do not reach them.
    await this.broadcast(
      client,
      [this.conversationRoom(conversationBefore.id)],
      new GroupMemberRemovedEvent({
        conversationId: data.conversationId,
        userId: data.userId,
      }),
    );

    await this.leaveConversationRoom(data.userId, data.conversationId);

    return { conversationId: data.conversationId, userId: data.userId };
  }

  @SubscribeMessage('conversation.group.member.role')
  async changeGroupMemberRole(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChangeGroupMemberRoleRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const member = await this.commandBus.execute(
      new ChangeGroupMemberRoleCommand(
        data.conversationId,
        authUserId,
        data.userId,
        data.role,
      ),
    );

    const conversation = await this.conversationRepository.getConversationById(
      data.conversationId,
    );
    const rooms = (conversation?.getActiveMembers() ?? []).map(
      (m) => `user-${m.userId}`,
    );

    await this.broadcast(
      client,
      rooms,
      new GroupMemberRoleChangedEvent({
        conversationId: data.conversationId,
        userId: data.userId,
        role: member.role,
      }),
    );

    return {
      conversationId: data.conversationId,
      userId: data.userId,
      role: member.role,
    };
  }

  @SubscribeMessage('conversation.group.leave')
  async leaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GroupConversationRequest,
    @CurrentUserId() authUserId: string,
  ): Promise<any> {
    const conversationBefore =
      await this.conversationRepository.getConversationById(
        data.conversationId,
      );

    const result = await this.commandBus.execute(
      new LeaveGroupCommand(data.conversationId, authUserId),
    );

    // The leaving member was the last one, so the group no longer exists.
    if (!result.conversationDeleted) {
      const rooms = [this.conversationRoom(conversationBefore.id)];

      // The last admin left: tell the group who the new admin is.
      if (result.promotedAdminId) {
        await this.broadcast(
          client,
          rooms,
          new GroupMemberRoleChangedEvent({
            conversationId: data.conversationId,
            userId: result.promotedAdminId,
            role: ConversationMemberRole.ADMIN,
          }),
        );
      }

      await this.broadcast(
        client,
        rooms,
        new GroupLeftEvent({
          conversationId: data.conversationId,
          userId: authUserId,
        }),
      );
    }

    // The event has been delivered; now drop the leaving user's sockets from
    // the conversation room.
    await this.leaveConversationRoom(authUserId, data.conversationId);

    return {
      conversationId: data.conversationId,
      userId: authUserId,
      promotedAdminId: result.promotedAdminId,
      conversationDeleted: result.conversationDeleted,
    };
  }

  @SubscribeMessage('conversation.group.members')
  async getGroupMembers(
    @MessageBody() data: GroupConversationRequest,
  ): Promise<any> {
    const members = await this.queryBus.execute(
      new GetGroupMembersQuery(data.conversationId),
    );

    const users = await this.userIntegrationPort.getUsersByIds(
      members.map((member) => member.userId),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));

    return members.map((member) => {
      const user = usersById.get(member.userId);
      return {
        id: member.id,
        userId: member.userId,
        username: user?.username,
        avatarIndex: user?.avatarIndex,
        avatar: user?.avatar,
        role: member.role,
      };
    });
  }
}
