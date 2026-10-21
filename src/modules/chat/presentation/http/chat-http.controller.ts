import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  BlockRequestBody,
  BlockResponse,
} from '@modules/chat/presentation/http/dtos/block.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BlockUserCommand } from '@modules/chat/application/commands/block-user/block-user.command';
import { UnblockUserCommand } from '@modules/chat/application/commands/unblock-user/unblock-user.command';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import {
  UnblockRequestParams,
  UnblockResponse,
} from '@modules/chat/presentation/http/dtos/unblock.dto';
import {
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ChatHttpGuard } from '@modules/chat/presentation/http/guards/chat-http.guard';
import {
  FileStoragePort,
  UploadedFilePayload,
} from '@modules/chat/application/ports/file-storage.port';
import {
  CreateGroupConversationHttpRequest,
  CreateGroupConversationHttpResponse,
} from '@modules/chat/presentation/http/dtos/create-group-conversation.dto';
import { CreateGroupConversationCommand } from '@modules/chat/application/commands/create-group-conversation/create-group-conversation.command';
import { CreateMessageCommand } from '@modules/chat/application/commands/create-message/create-message.command';
import { DeleteConversationCommand } from '@modules/chat/application/commands/delete-conversation/delete-conversation.command';
import { MessageType } from '@modules/chat/domain/enums/chat-type.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import {
  UpdateGroupConversationHttpRequest,
  UpdateGroupConversationHttpResponse,
} from '@modules/chat/presentation/http/dtos/update-group-conversation.dto';
import {
  GetGroupConversationListQueryDto,
  GroupConversationListBaseResponseDto,
  GroupConversationListResponseDto,
  MyGroupConversationListBaseResponseDto,
  MyGroupConversationListResponseDto,
} from '@modules/chat/presentation/http/dtos/group-conversation-list.dto';
import { UpdateGroupConversationCommand } from '@modules/chat/application/commands/update-group-conversation/update-group-conversation.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ChatWsGateway } from '@modules/chat/presentation/ws/chat-ws.gateway';
import { GroupConversationUpdatedEvent } from '@modules/chat/presentation/ws/events/group.events';
import { GetUserGroupConversationListQuery } from '@modules/chat/application/queries/get-user-group-conversation-list/get-user-group-conversation-list.query';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { ResponseMessage } from '@common/http/decorators/response-message.decorator';
import { ApiBaseResponse } from '@common/http/decorators/api-base-response.decorator';

const MAX_GROUP_PICTURE_SIZE = 1 * 1024 * 1024;

@Controller('/v1/chat')
@ApiTags('Chat')
export class ChatHttpController {
  private readonly logger = new Logger(ChatHttpController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly fileStorage: FileStoragePort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly chatWsGateway: ChatWsGateway,
  ) {}

  @ApiOperation({
    summary: 'List group conversations',
    description:
      'Returns a paginated list of all groups. Use `search` to filter by group title. `createdByMe` indicates whether the current user created each group.',
  })
  @ApiOkResponse({ type: GroupConversationListBaseResponseDto })
  @ResponseMessage('Groups retrieved successfully')
  @Get('group')
  @UseGuards(ChatHttpGuard)
  async getGroupConversationList(
    @Query() query: GetGroupConversationListQueryDto,
    @CurrentUserId() authUserId: string,
  ): Promise<GroupConversationListResponseDto> {
    const pagination = PaginationHelper.parse(query.page, query.pageSize);

    const result = (await this.queryBus.execute(
      new GetUserGroupConversationListQuery(
        authUserId,
        pagination,
        query.search,
      ),
    )) as GroupConversationListResponseDto;

    return this.mapGroupConversationListResponse(result);
  }

  @ApiOperation({
    summary: 'List my group conversations',
    description:
      'Returns a paginated list of groups where the current user is an active member. Supports the same `search` filter as `GET /v1/chat/group` and additionally returns `notSeenCount`.',
  })
  @ApiOkResponse({ type: MyGroupConversationListBaseResponseDto })
  @ResponseMessage('My groups retrieved successfully')
  @Get('group/mine')
  @UseGuards(ChatHttpGuard)
  async getMyGroupConversationList(
    @Query() query: GetGroupConversationListQueryDto,
    @CurrentUserId() authUserId: string,
  ): Promise<MyGroupConversationListResponseDto> {
    const pagination = PaginationHelper.parse(query.page, query.pageSize);

    const result = (await this.queryBus.execute(
      new GetUserGroupConversationListQuery(
        authUserId,
        pagination,
        query.search,
        true,
      ),
    )) as MyGroupConversationListResponseDto;

    return this.mapMyGroupConversationListResponse(result);
  }

  @ApiOperation({
    summary: 'Create group conversation',
    description:
      'Creates a group with only the current user as ADMIN. The picture can be uploaded in the same multipart request. Optionally sends the first message.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Team' },
        picture: { type: 'string', format: 'binary' },
        content: { type: 'string', description: 'Optional first message' },
      },
      required: ['title'],
    },
  })
  @ApiBaseResponse(CreateGroupConversationHttpResponse, { created: true })
  @ResponseMessage('Group created successfully')
  @Post('group')
  @UseGuards(ChatHttpGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: { fileSize: MAX_GROUP_PICTURE_SIZE },
    }),
  )
  async createGroupConversation(
    @Body() body: CreateGroupConversationHttpRequest,
    @UploadedFile() pictureFile: UploadedFilePayload | undefined,
    @CurrentUserId() authUserId: string,
  ): Promise<CreateGroupConversationHttpResponse> {
    let uploadedPicturePath: string | null = null;
    let picturePath = body.picture?.trim()
      ? this.fileStorage.normalizeGroupPictureKey(body.picture)
      : null;
    let conversation: ConversationEntity | null = null;

    try {
      if (pictureFile) {
        uploadedPicturePath =
          await this.fileStorage.saveGroupPicture(pictureFile);
        picturePath = uploadedPicturePath;
      }

      conversation = await this.commandBus.execute(
        new CreateGroupConversationCommand(authUserId, body.title, picturePath),
      );

      if (body.content?.trim()) {
        await this.commandBus.execute(
          new CreateMessageCommand(
            body.content,
            MessageType.TEXT,
            authUserId,
            conversation.id,
          ),
        );
      }
    } catch (error) {
      await this.rollbackGroupCreation(conversation, uploadedPicturePath);
      throw error;
    }

    return {
      id: conversation.id,
      type: ConversationType.GROUP,
      title: conversation.title,
      picture: this.fileStorage.getGroupPictureUrl(conversation.picture),
      role: ConversationMemberRole.ADMIN,
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  private async rollbackGroupCreation(
    conversation: ConversationEntity | null,
    uploadedPicturePath: string | null,
  ): Promise<void> {
    if (conversation) {
      try {
        await this.commandBus.execute(
          new DeleteConversationCommand(conversation.id),
        );
      } catch (error) {
        this.logger.error(
          `Failed to roll back group ${conversation.id}: ${(error as Error).message}`,
        );
      }
    }

    if (uploadedPicturePath) {
      try {
        await this.fileStorage.deleteGroupPicture(uploadedPicturePath);
      } catch (error) {
        this.logger.error(
          `Failed to delete uploaded picture ${uploadedPicturePath}: ${(error as Error).message}`,
        );
      }
    }
  }

  @ApiOperation({
    summary: 'Update group conversation',
    description:
      'Updates a group title and/or picture. Only group admins can update. The picture can be uploaded in the same multipart request. If no picture is provided, the existing picture is removed.',
  })
  @ApiParam({ name: 'conversationId' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Team' },
        picture: { type: 'string', format: 'binary' },
        removePicture: {
          type: 'boolean',
          description: 'Set to true to remove the current picture',
        },
      },
    },
  })
  @ApiBaseResponse(UpdateGroupConversationHttpResponse)
  @ResponseMessage('Group updated successfully')
  @Patch('group/:conversationId')
  @UseGuards(ChatHttpGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: { fileSize: MAX_GROUP_PICTURE_SIZE },
    }),
  )
  async updateGroupConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: UpdateGroupConversationHttpRequest,
    @UploadedFile() pictureFile: UploadedFilePayload | undefined,
    @CurrentUserId() authUserId: string,
  ): Promise<UpdateGroupConversationHttpResponse> {
    const pictureFromBody = body.picture?.trim()
      ? this.fileStorage.normalizeGroupPictureKey(body.picture)
      : undefined;

    if (
      body.title === undefined &&
      pictureFromBody === undefined &&
      !body.removePicture &&
      !pictureFile
    ) {
      throw new BadRequestException('Nothing to update');
    }

    let uploadedPicturePath: string | null = null;
    let picture: string | null = pictureFromBody ?? null;
    if (body.removePicture) {
      picture = null;
    }

    let previousPicture: string | null;
    let conversation: ConversationEntity;

    try {
      if (pictureFile) {
        uploadedPicturePath =
          await this.fileStorage.saveGroupPicture(pictureFile);
        picture = uploadedPicturePath;
      }

      previousPicture = await this.getGroupPictureOrNull(conversationId);

      conversation = await this.commandBus.execute(
        new UpdateGroupConversationCommand(
          conversationId,
          authUserId,
          body.title,
          picture,
        ),
      );
    } catch (error) {
      if (uploadedPicturePath) {
        try {
          await this.fileStorage.deleteGroupPicture(uploadedPicturePath);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to delete uploaded picture ${uploadedPicturePath}: ${(cleanupError as Error).message}`,
          );
        }
      }
      throw error;
    }

    // The update already succeeded; cleanup and broadcast failures must not
    // roll back the stored picture.
    const previousPictureUrl = previousPicture
      ? this.fileStorage.getGroupPictureUrl(previousPicture)
      : null;
    const currentPictureUrl = this.fileStorage.getGroupPictureUrl(
      conversation.picture,
    );

    if (previousPicture && previousPictureUrl !== currentPictureUrl) {
      try {
        await this.fileStorage.deleteGroupPicture(previousPicture);
      } catch (error) {
        this.logger.warn(
          `Failed to delete previous group picture ${previousPicture}: ${(error as Error).message}`,
        );
      }
    }

    try {
      await this.broadcastGroupUpdated(conversation);
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast group update for ${conversation.id}: ${(error as Error).message}`,
      );
    }

    return {
      id: conversation.id,
      title: conversation.title,
      picture: currentPictureUrl,
    };
  }

  private async broadcastGroupUpdated(
    conversation: ConversationEntity,
  ): Promise<void> {
    if (!this.chatWsGateway.server) {
      return;
    }

    const rooms = conversation
      .getActiveMembers()
      .map((member) => `user-${member.userId}`);

    await this.chatWsGateway.serverBroadcast(
      this.chatWsGateway.server,
      rooms,
      new GroupConversationUpdatedEvent({
        conversationId: conversation.id,
        title: conversation.title,
        picture: this.fileStorage.getGroupPictureUrl(conversation.picture),
        updatedBy: conversation.updatedBy,
      }),
    );
  }

  private async getGroupPictureOrNull(
    conversationId: string,
  ): Promise<string | null> {
    try {
      const conversation =
        await this.conversationRepository.getConversationById(conversationId);
      return conversation?.picture ?? null;
    } catch {
      return null;
    }
  }

  @ApiOperation({
    summary: 'Block',
    description: 'Block a user',
  })
  @ApiBaseResponse(BlockResponse, {
    description: 'Successfully blocked the user',
  })
  @ApiConflictResponse({
    type: null,
    description: 'User is already blocked',
  })
  @Post('user/block')
  @ResponseMessage('User blocked successfully')
  @UseGuards(ChatHttpGuard)
  async block(
    @Body() body: BlockRequestBody,
    @CurrentUserId() authUserId: string,
  ): Promise<BlockResponse> {
    const success = await this.commandBus.execute(
      new BlockUserCommand(authUserId, body.targetUserId),
    );

    if (success === false) {
      throw new ConflictException('User is already blocked');
    }

    return {};
  }

  @ApiOperation({
    summary: 'Unblock',
    description: 'Unblock a blocked user',
  })
  @ApiBaseResponse(UnblockResponse, {
    description: 'Successfully unblocked the user',
  })
  @Delete('/user/block/:targetUserId')
  @ResponseMessage('User unblocked successfully')
  @UseGuards(ChatHttpGuard)
  async unblock(
    @Param() params: UnblockRequestParams,
    @CurrentUserId() authUserId: string,
  ): Promise<UnblockResponse> {
    await this.commandBus.execute(
      new UnblockUserCommand(authUserId, params.targetUserId),
    );

    return {};
  }

  private mapGroupConversationListResponse(
    result: GroupConversationListResponseDto,
  ): GroupConversationListResponseDto {
    return {
      ...result,
      data: result.data.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        picture: this.fileStorage.getGroupPictureUrl(item.picture),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        memberCount: item.memberCount,
        createdByMe: item.createdByMe,
      })),
    };
  }

  private mapMyGroupConversationListResponse(
    result: MyGroupConversationListResponseDto,
  ): MyGroupConversationListResponseDto {
    return {
      ...result,
      data: result.data.map((item) => ({
        ...item,
        picture: this.fileStorage.getGroupPictureUrl(item.picture),
      })),
    };
  }
}
