import { Test, TestingModule } from '@nestjs/testing';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { GetIntegrationReportListHandler } from './get-integration-report-list.handler';
import { GetIntegrationReportListQuery } from './get-integration-report-list.query';

describe('GetIntegrationReportListHandler', () => {
  let handler: GetIntegrationReportListHandler;
  let reportRepository: jest.Mocked<ReportRepositoryPort>;

  beforeEach(async () => {
    reportRepository = {
      getDirectReportList: jest.fn(),
    } as unknown as jest.Mocked<ReportRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIntegrationReportListHandler,
        { provide: ReportRepositoryPort, useValue: reportRepository },
      ],
    }).compile();

    handler = module.get(GetIntegrationReportListHandler);
  });

  it('returns mapped reports with pagination metadata', async () => {
    const report = ReportEntity.createDirect(
      'reporter-1',
      'reported-1',
      'conversation-1',
      'Abusive messages',
    );
    const pagination = PaginationHelper.parse(2, 10);
    reportRepository.getDirectReportList.mockResolvedValue({
      data: [report],
      meta: {
        page: 2,
        pageSize: 10,
        total: 11,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      },
    });

    const result = await handler.execute(
      new GetIntegrationReportListQuery(pagination, ReportStatus.PENDING),
    );

    expect(reportRepository.getDirectReportList).toHaveBeenCalledWith(
      pagination,
      ReportStatus.PENDING,
    );
    expect(result.data[0]).toMatchObject({
      id: report.id,
      reporterId: 'reporter-1',
      reportedUserId: 'reported-1',
      conversationId: 'conversation-1',
      description: 'Abusive messages',
      status: ReportStatus.PENDING,
    });
    expect(result.meta.total).toBe(11);
  });
});
