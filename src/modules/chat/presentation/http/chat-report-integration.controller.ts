import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaginatedResult } from '@common/pagination/pagination.interface';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { ResponseMessage } from '@common/http/decorators/response-message.decorator';
import { ReportIntegrationReadDto } from '@modules/chat/application/dtos/report-integration-read.dto';
import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import { GetIntegrationReportListQuery } from '@modules/chat/application/queries/get-integration-report-list/get-integration-report-list.query';
import { GetIntegrationReportMessagesQuery } from '@modules/chat/application/queries/get-integration-report-messages/get-integration-report-messages.query';
import { ChatIntegrationScope } from '@modules/chat/application/ports/chat-integration-auth.port';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import {
  GetIntegrationReportListQueryDto,
  IntegrationPaginationQueryDto,
  IntegrationReportListBaseResponseDto,
  IntegrationReportMessagesBaseResponseDto,
} from '@modules/chat/presentation/http/dtos/report-integration.dto';
import { RequireIntegrationScopes } from '@modules/chat/presentation/http/decorators/require-integration-scopes.decorator';
import { ChatIntegrationGuard } from '@modules/chat/presentation/http/guards/chat-integration.guard';
import { IntegrationScopeGuard } from '@modules/chat/presentation/http/guards/integration-scope.guard';

@Controller('/v1/chat/integration/reports')
@ApiTags('Chat Integration')
@ApiBearerAuth('Token')
@UseGuards(ChatIntegrationGuard, IntegrationScopeGuard)
@RequireIntegrationScopes(ChatIntegrationScope.REPORTS_READ)
@ApiUnauthorizedResponse({
  description: 'Missing or invalid service integration token',
})
@ApiForbiddenResponse({ description: 'chat.reports.read scope is required' })
export class ChatReportIntegrationController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'List reported direct conversations',
    description:
      'Returns a paginated integration queue of direct-conversation reports. It defaults to PENDING reports; use the status query parameter to browse other states.',
  })
  @ApiOkResponse({ type: IntegrationReportListBaseResponseDto })
  @ResponseMessage('Reports retrieved successfully')
  @Get()
  async getReportList(
    @Query() query: GetIntegrationReportListQueryDto,
  ): Promise<PaginatedResult<ReportIntegrationReadDto>> {
    const pagination = PaginationHelper.parse(query.page, query.pageSize);

    return this.queryBus.execute(
      new GetIntegrationReportListQuery(
        pagination,
        query.status ?? ReportStatus.PENDING,
      ),
    );
  }

  @ApiOperation({
    summary: 'Get messages from a reported conversation',
    description:
      'Returns the reported direct conversation message history, newest first. The report ID must identify an existing direct-conversation report.',
  })
  @ApiParam({ name: 'reportId', description: 'UUIDv7 report ID' })
  @ApiOkResponse({ type: IntegrationReportMessagesBaseResponseDto })
  @ApiNotFoundResponse({
    description: 'Report or its conversation no longer exists',
  })
  @ResponseMessage('Reported conversation messages retrieved successfully')
  @Get(':reportId/messages')
  async getReportMessages(
    @Param('reportId', new ParseUUIDPipe({ version: '7' })) reportId: string,
    @Query() query: IntegrationPaginationQueryDto,
  ): Promise<PaginatedResult<MessageReadDto>> {
    const pagination = PaginationHelper.parse(query.page, query.pageSize);

    return this.queryBus.execute(
      new GetIntegrationReportMessagesQuery(reportId, pagination),
    );
  }
}
