import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { GetIntegrationReportListQuery } from '@modules/chat/application/queries/get-integration-report-list/get-integration-report-list.query';
import { GetIntegrationReportMessagesQuery } from '@modules/chat/application/queries/get-integration-report-messages/get-integration-report-messages.query';
import { ChatReportIntegrationController } from './chat-report-integration.controller';
import { ChatIntegrationGuard } from './guards/chat-integration.guard';
import { IntegrationScopeGuard } from './guards/integration-scope.guard';

describe('ChatReportIntegrationController', () => {
  let controller: ChatReportIntegrationController;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatReportIntegrationController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    })
      .overrideGuard(ChatIntegrationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IntegrationScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ChatReportIntegrationController);
  });

  it('lists pending reports by default with sanitized pagination', async () => {
    queryBus.execute.mockResolvedValue({ data: [], meta: {} });

    await controller.getReportList({ page: 2, pageSize: 10 });

    const query = queryBus.execute.mock
      .calls[0][0] as GetIntegrationReportListQuery;
    expect(query.status).toBe(ReportStatus.PENDING);
    expect(query.pagination).toEqual({
      page: 2,
      pageSize: 10,
      offset: 10,
      limit: 10,
    });
  });

  it('uses an explicit report status filter', async () => {
    queryBus.execute.mockResolvedValue({ data: [], meta: {} });

    await controller.getReportList({ status: ReportStatus.RESOLVED });

    const query = queryBus.execute.mock
      .calls[0][0] as GetIntegrationReportListQuery;
    expect(query.status).toBe(ReportStatus.RESOLVED);
  });

  it('requests a paginated reported-conversation message list', async () => {
    queryBus.execute.mockResolvedValue({ data: [], meta: {} });

    await controller.getReportMessages('report-1', {
      page: 3,
      pageSize: 20,
    });

    const query = queryBus.execute.mock
      .calls[0][0] as GetIntegrationReportMessagesQuery;
    expect(query.reportId).toBe('report-1');
    expect(query.pagination).toEqual({
      page: 3,
      pageSize: 20,
      offset: 40,
      limit: 20,
    });
  });
});
