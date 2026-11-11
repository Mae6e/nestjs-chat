import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ReportDirectMessageCommand } from './report-direct-message.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import {
  ConversationNotFoundException,
  NotADirectConversationException,
  ReportAlreadyExistsException,
  ReportDescriptionRequiredException,
  ReportTargetNotInConversationException,
} from '@modules/chat/domain/chat.exceptions';

@CommandHandler(ReportDirectMessageCommand)
export class ReportDirectMessageHandler implements ICommandHandler<
  ReportDirectMessageCommand,
  ReportEntity
> {
  private readonly logger = new Logger(ReportDirectMessageHandler.name);

  constructor(
    private readonly commandRepo: ConversationRepositoryPort,
    private readonly reportRepo: ReportRepositoryPort,
  ) {}

  async execute(command: ReportDirectMessageCommand): Promise<ReportEntity> {
    const { reporterId, conversationId } = command;
    const description = command.description?.trim();

    if (!description) {
      throw new ReportDescriptionRequiredException();
    }

    const conversation =
      await this.commandRepo.getConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    if (conversation.type !== ConversationType.DIRECT) {
      throw new NotADirectConversationException(conversationId);
    }

    if (!conversation.isMember(reporterId)) {
      throw new ConversationNotFoundException(conversationId);
    }

    // The reported user is the other active member of the direct conversation.
    const targetMember = conversation
      .getActiveMembers()
      .find((member) => member.userId !== reporterId);
    if (!targetMember) {
      throw new ReportTargetNotInConversationException(conversationId);
    }

    const targetUserId = targetMember.userId;

    const existingReport = await this.reportRepo.findPendingDirectReport(
      reporterId,
      targetUserId,
      conversationId,
    );
    if (existingReport) {
      throw new ReportAlreadyExistsException(existingReport.id);
    }

    const report = ReportEntity.createDirect(
      reporterId,
      targetUserId,
      conversationId,
      description,
    );

    let savedReport: ReportEntity;
    try {
      savedReport = await this.reportRepo.saveReport(report);
    } catch (error) {
      // The partial unique index also protects against concurrent requests
      // that both pass the pending-report check above.
      const code =
        (error as { driverError?: { code?: string } }).driverError?.code ??
        (error as { code?: string }).code;
      if (code === '23505') {
        throw new ReportAlreadyExistsException();
      }
      throw error;
    }

    this.logger.log(
      `User ${reporterId} reported user ${targetUserId} in conversation ${conversationId}`,
    );

    return savedReport;
  }
}
