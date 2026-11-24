import { Test, TestingModule } from '@nestjs/testing';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import {
  ReportConversationNotFoundException,
  ReportNotFoundException,
} from '@modules/chat/domain/chat.exceptions';
import { GetIntegrationReportMessagesHandler } from './get-integration-report-messages.handler';
import { GetIntegrationReportMessagesQuery } from './get-integration-report-messages.query';

describe('GetIntegrationReportMessagesHandler', () => {
  let handler: GetIntegrationReportMessagesHandler;
  let reportRepository: jest.Mocked<ReportRepositoryPort>;

  beforeEach(async () => {
    reportRepository = {
      findDirectReportById: jest.fn(),
      getReportedConversationMessageList: jest.fn(),
    } as unknown as jest.Mocked<ReportRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIntegrationReportMessagesHandler,
        { provide: ReportRepositoryPort, useValue: reportRepository },
      ],
    }).compile();

    handler = module.get(GetIntegrationReportMessagesHandler);
  });

  it('rejects an unknown report', async () => {
    reportRepository.findDirectReportById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GetIntegrationReportMessagesQuery(
          'report-1',
          PaginationHelper.parse(1, 25),
        ),
      ),
    ).rejects.toBeInstanceOf(ReportNotFoundException);
  });

  it('rejects a report whose conversation no longer exists', async () => {
    const now = new Date();
    const report = ReportEntity.reconstruct(
      'report-1',
      ReportType.DIRECT_USER,
      'reporter-1',
      'reported-1',
      null,
      null,
      null,
      'Description',
      ReportStatus.PENDING,
      now,
      now,
    );
    reportRepository.findDirectReportById.mockResolvedValue(report);

    await expect(
      handler.execute(
        new GetIntegrationReportMessagesQuery(
          report.id,
          PaginationHelper.parse(1, 25),
        ),
      ),
    ).rejects.toBeInstanceOf(ReportConversationNotFoundException);
  });

  it('returns the reported conversation messages', async () => {
    const report = ReportEntity.createDirect(
      'reporter-1',
      'reported-1',
      'conversation-1',
      'Description',
    );
    const pagination = PaginationHelper.parse(1, 25);
    reportRepository.findDirectReportById.mockResolvedValue(report);
    reportRepository.getReportedConversationMessageList.mockResolvedValue({
      data: [
        {
          id: 'message-1',
          text: 'Message',
          type: 'TEXT',
          senderId: 'reported-1',
          createdAt: new Date().toISOString(),
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    });

    const result = await handler.execute(
      new GetIntegrationReportMessagesQuery(report.id, pagination),
    );

    expect(
      reportRepository.getReportedConversationMessageList,
    ).toHaveBeenCalledWith('conversation-1', pagination);
    expect(result.data[0].senderId).toBe('reported-1');
  });
});
