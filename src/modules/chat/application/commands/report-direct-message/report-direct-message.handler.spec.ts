import { Test, TestingModule } from '@nestjs/testing';
import { ReportDirectMessageHandler } from './report-direct-message.handler';
import { ReportDirectMessageCommand } from './report-direct-message.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import {
  ConversationNotFoundException,
  NotADirectConversationException,
  ReportAlreadyExistsException,
  ReportDescriptionRequiredException,
  ReportTargetNotInConversationException,
} from '@modules/chat/domain/chat.exceptions';

describe('ReportDirectMessageHandler', () => {
  let handler: ReportDirectMessageHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;
  let reportRepo: jest.Mocked<ReportRepositoryPort>;

  const buildDirectConversation = () =>
    ConversationEntity.createDirect('user-1', 'user-2');

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepositoryPort>;

    reportRepo = {
      findPendingDirectReport: jest.fn(),
      saveReport: jest.fn(),
    } as unknown as jest.Mocked<ReportRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDirectMessageHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
        { provide: ReportRepositoryPort, useValue: reportRepo },
      ],
    }).compile();

    handler = module.get<ReportDirectMessageHandler>(
      ReportDirectMessageHandler,
    );
  });

  it('rejects a blank description', async () => {
    await expect(
      handler.execute(
        new ReportDirectMessageCommand('user-1', 'conversation-1', '   '),
      ),
    ).rejects.toThrow(ReportDescriptionRequiredException);

    expect(commandRepo.getConversationById).not.toHaveBeenCalled();
  });

  it('rejects an unknown conversation', async () => {
    commandRepo.getConversationById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new ReportDirectMessageCommand(
          'user-1',
          'conversation-1',
          'abusive messages',
        ),
      ),
    ).rejects.toThrow(ConversationNotFoundException);
  });

  it('rejects a group conversation', async () => {
    const group = ConversationEntity.createGroup('user-1', 'Team', ['user-2']);

    commandRepo.getConversationById.mockResolvedValue(group);

    await expect(
      handler.execute(
        new ReportDirectMessageCommand('user-1', group.id, 'abusive messages'),
      ),
    ).rejects.toThrow(NotADirectConversationException);
  });

  it('rejects when the reporter is not a member of the conversation', async () => {
    const conversation = buildDirectConversation();

    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new ReportDirectMessageCommand(
          'user-3',
          conversation.id,
          'abusive messages',
        ),
      ),
    ).rejects.toThrow(ConversationNotFoundException);
  });

  it('rejects when there is no other active member to report', async () => {
    const conversation = buildDirectConversation();
    conversation.removeMember('user-2');

    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new ReportDirectMessageCommand(
          'user-1',
          conversation.id,
          'abusive messages',
        ),
      ),
    ).rejects.toThrow(ReportTargetNotInConversationException);
  });

  it('rejects a duplicate pending report', async () => {
    const conversation = buildDirectConversation();

    commandRepo.getConversationById.mockResolvedValue(conversation);
    reportRepo.findPendingDirectReport.mockResolvedValue(
      ReportEntity.createDirect(
        'user-1',
        'user-2',
        conversation.id,
        'abusive messages',
      ),
    );

    await expect(
      handler.execute(
        new ReportDirectMessageCommand(
          'user-1',
          conversation.id,
          'abusive messages',
        ),
      ),
    ).rejects.toThrow(ReportAlreadyExistsException);

    expect(reportRepo.saveReport).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation to a duplicate report error', async () => {
    const conversation = buildDirectConversation();

    commandRepo.getConversationById.mockResolvedValue(conversation);
    reportRepo.findPendingDirectReport.mockResolvedValue(null);
    reportRepo.saveReport.mockRejectedValue({ code: '23505' });

    await expect(
      handler.execute(
        new ReportDirectMessageCommand(
          'user-1',
          conversation.id,
          'abusive messages',
        ),
      ),
    ).rejects.toThrow(ReportAlreadyExistsException);
  });

  it('derives the target user and saves a pending direct-message report', async () => {
    const conversation = buildDirectConversation();

    commandRepo.getConversationById.mockResolvedValue(conversation);
    reportRepo.findPendingDirectReport.mockResolvedValue(null);
    reportRepo.saveReport.mockImplementation(async (report) => report);

    const result = await handler.execute(
      new ReportDirectMessageCommand(
        'user-1',
        conversation.id,
        '  Sending abusive messages  ',
      ),
    );

    expect(reportRepo.findPendingDirectReport).toHaveBeenCalledWith(
      'user-1',
      'user-2',
      conversation.id,
    );
    expect(reportRepo.saveReport).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(ReportEntity);
    expect(result.reporterId).toBe('user-1');
    expect(result.reportedUserId).toBe('user-2');
    expect(result.conversationId).toBe(conversation.id);
    expect(result.reason).toBeNull();
    expect(result.description).toBe('Sending abusive messages');
    expect(result.status).toBe('PENDING');
  });
});
