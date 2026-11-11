import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { ReportEntity } from '@modules/chat/domain/models/report.model';

@Entity({ schema: 'chat', name: 'reports' })
export class Report {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'char', length: 24 })
  @Index('reports_reporter_id_idx')
  reporter_id: string;

  @Column({ type: 'char', length: 24, nullable: true })
  @Index('reports_reported_user_id_idx')
  reported_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index('reports_conversation_id_idx')
  conversation_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index('reports_message_id_idx')
  message_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  @Index('reports_status_idx')
  status: ReportStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date | null;

  static fromDomain(entity: ReportEntity): Report {
    if (!entity) return null;

    const report = new Report();
    report.id = entity.id;
    report.type = entity.type;
    report.reporter_id = entity.reporterId;
    report.reported_user_id = entity.reportedUserId;
    report.conversation_id = entity.conversationId;
    report.message_id = entity.messageId;
    report.reason = entity.reason;
    report.description = entity.description;
    report.status = entity.status;
    report.created_at = entity.createdAt;
    report.updated_at = entity.updatedAt;
    report.deleted_at = entity.deletedAt;

    return report;
  }

  static toDomain(report: Report): ReportEntity {
    if (!report) return null;

    return ReportEntity.reconstruct(
      report.id,
      report.type,
      report.reporter_id,
      report.reported_user_id,
      report.conversation_id,
      report.message_id,
      report.reason,
      report.description,
      report.status,
      report.created_at,
      report.updated_at,
      report.deleted_at,
    );
  }
}
