import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { Report } from '@modules/chat/infrastructure/database/postgres/entities/report.entity';
import { ReportEntity } from '@modules/chat/domain/models/report.model';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@common/pagination/pagination.interface';
import { PaginationHelper } from '@common/pagination/pagination.helper';
import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';

@Injectable()
export class ReportPostgresRepository implements ReportRepositoryPort {
  constructor(
    @InjectDataSource(DatabaseType.POSTGRES)
    private readonly dataSource: DataSource,
  ) {}

  async findPendingDirectReport(
    reporterId: string,
    reportedUserId: string,
    conversationId: string,
  ): Promise<ReportEntity | null> {
    const report = await this.dataSource.getRepository(Report).findOne({
      where: {
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        conversation_id: conversationId,
        type: ReportType.DIRECT_USER,
        status: ReportStatus.PENDING,
      },
    });

    return report ? Report.toDomain(report) : null;
  }

  async saveReport(reportEntity: ReportEntity): Promise<ReportEntity> {
    const report = Report.fromDomain(reportEntity);
    const saved = await this.dataSource.getRepository(Report).save(report);

    return Report.toDomain(saved);
  }

  async getDirectReportList(
    pagination: PaginationOptions,
    status: ReportStatus,
  ): Promise<PaginatedResult<ReportEntity>> {
    const [reports, total] = await this.dataSource
      .getRepository(Report)
      .createQueryBuilder('report')
      .where('report.type = :type', { type: ReportType.DIRECT_USER })
      .andWhere('report.status = :status', { status })
      .orderBy('report.created_at', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .offset(pagination.offset)
      .limit(pagination.limit)
      .getManyAndCount();

    return PaginationHelper.createResult(
      reports.map((report) => Report.toDomain(report)),
      total,
      pagination,
    );
  }

  async findDirectReportById(reportId: string): Promise<ReportEntity | null> {
    const report = await this.dataSource.getRepository(Report).findOne({
      where: {
        id: reportId,
        type: ReportType.DIRECT_USER,
      },
    });

    return report ? Report.toDomain(report) : null;
  }

  async getReportedConversationMessageList(
    conversationId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MessageReadDto>> {
    const [messages, total] = await this.dataSource
      .getRepository(Message)
      .createQueryBuilder('message')
      // Include soft-deleted conversation members so messages remain
      // attributable after a participant leaves. Soft-deleted messages are
      // explicitly excluded below.
      .withDeleted()
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.deleted_at IS NULL')
      .orderBy('message.created_at', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .offset(pagination.offset)
      .limit(pagination.limit)
      .getManyAndCount();

    const data: MessageReadDto[] = messages.map((message) => ({
      id: message.id,
      text: message.text,
      type: message.type,
      senderId: message.sender ? message.sender.user_id : message.sender_id,
      createdAt: message.created_at.toISOString(),
    }));

    return PaginationHelper.createResult(data, total, pagination);
  }
}
