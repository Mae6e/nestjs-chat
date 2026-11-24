import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { Report } from '@modules/chat/infrastructure/database/postgres/entities/report.entity';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { ReportPostgresRepository } from './report-postgres.repository';

describe('ReportPostgresRepository', () => {
  let repository: ReportPostgresRepository;
  let reportRepository: any;
  let messageRepository: any;
  let reportQueryBuilder: any;
  let messageQueryBuilder: any;

  const createQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  });

  beforeEach(async () => {
    reportQueryBuilder = createQueryBuilder();
    messageQueryBuilder = createQueryBuilder();
    reportRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(reportQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    messageRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(messageQueryBuilder),
    };
    const dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === Report) return reportRepository;
        if (entity === Message) return messageRepository;
        throw new Error('Unexpected repository');
      }),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportPostgresRepository,
        {
          provide: getDataSourceToken(DatabaseType.POSTGRES),
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get(ReportPostgresRepository);
  });

  it('returns a paginated status-filtered direct report list', async () => {
    const report = Report.fromDomain(
      ReportEntity.createDirect(
        'reporter-1',
        'reported-1',
        'conversation-1',
        'Description',
      ),
    );
    reportQueryBuilder.getManyAndCount.mockResolvedValue([[report], 1]);
    const pagination = PaginationHelper.parse(1, 25);

    const result = await repository.getDirectReportList(
      pagination,
      ReportStatus.PENDING,
    );

    expect(reportQueryBuilder.andWhere).toHaveBeenCalledWith(
      'report.status = :status',
      { status: ReportStatus.PENDING },
    );
    expect(reportQueryBuilder.offset).toHaveBeenCalledWith(0);
    expect(reportQueryBuilder.limit).toHaveBeenCalledWith(25);
    expect(result.data[0].conversationId).toBe('conversation-1');
    expect(result.meta.total).toBe(1);
  });

  it('loads a direct report by ID', async () => {
    const report = Report.fromDomain(
      ReportEntity.createDirect(
        'reporter-1',
        'reported-1',
        'conversation-1',
        'Description',
      ),
    );
    reportRepository.findOne.mockResolvedValue(report);

    const result = await repository.findDirectReportById(report.id);

    expect(result?.id).toBe(report.id);
  });

  it('returns paginated messages with platform sender IDs', async () => {
    const createdAt = new Date();
    messageQueryBuilder.getManyAndCount.mockResolvedValue([
      [
        {
          id: 'message-1',
          text: 'Message',
          type: 'TEXT',
          sender_id: 'member-1',
          sender: { user_id: 'user-1' },
          created_at: createdAt,
        },
      ],
      1,
    ]);
    const pagination = PaginationHelper.parse(1, 25);

    const result = await repository.getReportedConversationMessageList(
      'conversation-1',
      pagination,
    );

    expect(messageQueryBuilder.withDeleted).toHaveBeenCalled();
    expect(messageQueryBuilder.andWhere).toHaveBeenCalledWith(
      'message.deleted_at IS NULL',
    );
    expect(result.data[0]).toEqual({
      id: 'message-1',
      text: 'Message',
      type: 'TEXT',
      senderId: 'user-1',
      createdAt: createdAt.toISOString(),
    });
    expect(result.meta.total).toBe(1);
  });
});
