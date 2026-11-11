import { v7 as uuidv7 } from 'uuid';
import { AggregateRoot } from '@common/domain/aggregate-root';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';

export class ReportEntity extends AggregateRoot<string> {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    private readonly _type: ReportType,
    private readonly _reporterId: string,
    private readonly _reportedUserId: string | null,
    private readonly _conversationId: string | null,
    private readonly _messageId: string | null,
    private readonly _reason: string | null,
    private readonly _description: string | null,
    private _status: ReportStatus,
    private _deletedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  public static createDirect(
    reporterId: string,
    reportedUserId: string,
    conversationId: string,
    description: string,
  ): ReportEntity {
    const now = new Date();

    return new ReportEntity(
      uuidv7(),
      now,
      now,
      ReportType.DIRECT_USER,
      reporterId,
      reportedUserId,
      conversationId,
      null,
      null,
      description,
      ReportStatus.PENDING,
    );
  }

  public static reconstruct(
    id: string,
    type: ReportType,
    reporterId: string,
    reportedUserId: string | null,
    conversationId: string | null,
    messageId: string | null,
    reason: string,
    description: string | null,
    status: ReportStatus,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date,
  ): ReportEntity {
    return new ReportEntity(
      id,
      createdAt,
      updatedAt,
      type,
      reporterId,
      reportedUserId,
      conversationId,
      messageId,
      reason,
      description,
      status,
      deletedAt,
    );
  }

  public get type(): ReportType {
    return this._type;
  }
  public get reporterId(): string {
    return this._reporterId;
  }
  public get reportedUserId(): string | null {
    return this._reportedUserId;
  }
  public get conversationId(): string | null {
    return this._conversationId;
  }
  public get messageId(): string | null {
    return this._messageId;
  }
  public get reason(): string | null {
    return this._reason;
  }
  public get description(): string | null {
    return this._description;
  }
  public get status(): ReportStatus {
    return this._status;
  }
  public get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  public review(): void {
    this._status = ReportStatus.REVIEWED;
    this.updatedAt = new Date();
  }

  public resolve(): void {
    this._status = ReportStatus.RESOLVED;
    this.updatedAt = new Date();
  }

  public reject(): void {
    this._status = ReportStatus.REJECTED;
    this.updatedAt = new Date();
  }
}
