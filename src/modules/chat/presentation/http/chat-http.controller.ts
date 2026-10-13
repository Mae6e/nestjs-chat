import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  BlockRequestBody,
  BlockResponse,
} from '@modules/chat/presentation/http/dtos/block.dto';
import { CommandBus } from '@nestjs/cqrs';
import { BlockUserCommand } from '@modules/chat/application/commands/block-user/block-user.command';
import { UnblockUserCommand } from '@modules/chat/application/commands/unblock-user/unblock-user.command';
import { CurrentUserId } from '@common/decorators/current-user-id.decorator';
import {
  UnblockRequestParams,
  UnblockResponse,
} from '@modules/chat/presentation/http/dtos/unblock.dto';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChatHttpGuard } from '@modules/chat/presentation/http/guards/chat-http.guard';

@Controller('/v1/chat')
@ApiTags('Chat')
export class ChatHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Block',
    description: 'Block a user',
  })
  @ApiOkResponse({
    type: BlockResponse,
    description: 'Successfully blocked the user',
  })
  @ApiConflictResponse({
    type: null,
    description: 'User is already blocked',
  })
  @Post('block')
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
  @ApiOkResponse({
    type: UnblockResponse,
    description: 'Successfully blocked the user',
  })
  @ApiNoContentResponse({ type: null, description: 'User was not blocked' })
  @Delete('block/:targetUserId')
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
}
