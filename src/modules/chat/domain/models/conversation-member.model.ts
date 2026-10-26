import { Entity } from '@common/domain/entity';
import { MessageEntity } from '@modules/chat/domain/models/message.model';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { v7 as uuidv7 } from 'uuid';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

export class ConversationMemberEntity extends Entity<string> {
  private readonly _userId: string;
  private _role: ConversationMemberRole;
  private _status: ConversationMemberStatus;
  private readonly _conversationId: string;
  private _lastSeenMessageId?: string;
  private _lastMessageId?: string;
  private _updatedBy: string | null;
  private _deletedAt?: Date;

  // Transient properties
  private _conversation?: Partial<ConversationEntity>;
  private _lastSeenMessage?: Partial<MessageEntity>;
  private _lastMessage?: Partial<MessageEntity>;
  private _notSeenCount?: number;

  public get conversation() {
    return this._conversation;
  }
  public get lastSeenMessage() {
    return this._lastSeenMessage;
  }
  public get lastMessage() {
    return this._lastMessage;
  }
  public get notSeenCount() {
    return this._notSeenCount;
  }

  public loadConversation(c: Partial<ConversationEntity>) {
    this._conversation = c;
  }
  public loadLastSeenMessage(m: Partial<MessageEntity>) {
    this._lastSeenMessage = m;
  }
  public loadLastMessage(m: Partial<MessageEntity>) {
    this._lastMessage = m;
  }
  public loadNotSeenCount(count: number) {
    this._notSeenCount = count;
  }

  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    userId: string,
    role: ConversationMemberRole,
    status: ConversationMemberStatus,
    conversationId: string,
    lastSeenMessageId?: string,
    lastMessageId?: string,
    deletedAt?: Date,
    updatedBy: string | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this._userId = userId;
    this._role = role;
    this._status = status;
    this._conversationId = conversationId;
    this._lastSeenMessageId = lastSeenMessageId;
    this._lastMessageId = lastMessageId;
    this._deletedAt = deletedAt;
    this._updatedBy = updatedBy;
  }

  public static create(
    userId: string,
    conversationId: string,
    role: ConversationMemberRole = ConversationMemberRole.USER,
    status: ConversationMemberStatus = ConversationMemberStatus.ACTIVE,
    updatedBy: string | null = null,
  ): ConversationMemberEntity {
    return new ConversationMemberEntity(
      uuidv7(),
      new Date(),
      new Date(),
      userId,
      role,
      status,
      conversationId,
      undefined,
      undefined,
      undefined,
      updatedBy,
    );
  }

  public static reconstruct(
    id: string,
    userId: string,
    role: ConversationMemberRole,
    status: ConversationMemberStatus,
    conversationId: string,
    lastSeenMessageId: string | undefined,
    lastMessageId: string | undefined,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date,
    updatedBy: string | null = null,
  ): ConversationMemberEntity {
    return new ConversationMemberEntity(
      id,
      createdAt,
      updatedAt,
      userId,
      role,
      status,
      conversationId,
      lastSeenMessageId,
      lastMessageId,
      deletedAt,
      updatedBy,
    );
  }

  public get userId(): string {
    return this._userId;
  }
  public get role(): ConversationMemberRole {
    return this._role;
  }
  public get status(): ConversationMemberStatus {
    return this._status;
  }
  public get conversationId(): string {
    return this._conversationId;
  }
  public get lastSeenMessageId(): string | undefined {
    return this._lastSeenMessageId;
  }
  public get lastMessageId(): string | undefined {
    return this._lastMessageId;
  }
  public get updatedBy(): string | null {
    return this._updatedBy;
  }
  public get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  public isAdmin(): boolean {
    return (
      (this._role === ConversationMemberRole.OWNER ||
        this._role === ConversationMemberRole.ADMIN) &&
      this.isActive()
    );
  }

  public isOwner(): boolean {
    return this._role === ConversationMemberRole.OWNER && this.isActive();
  }

  public isActive(): boolean {
    return this._status === ConversationMemberStatus.ACTIVE && !this._deletedAt;
  }

  public isPending(): boolean {
    return (
      this._status === ConversationMemberStatus.PENDING && !this._deletedAt
    );
  }

  public isRejected(): boolean {
    return (
      this._status === ConversationMemberStatus.REJECTED && !this._deletedAt
    );
  }

  /**
   * Marks the membership as an accepted / active membership.
   */
  public activate(): void {
    this._status = ConversationMemberStatus.ACTIVE;
    this._deletedAt = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Marks the membership as awaiting admin approval.
   */
  public requestToJoin(): void {
    this._status = ConversationMemberStatus.PENDING;
    this._deletedAt = undefined;
    this.updatedAt = new Date();
  }

  public approve(updatedBy?: string | null): void {
    this._status = ConversationMemberStatus.ACTIVE;
    this._deletedAt = undefined;
    if (updatedBy !== undefined) {
      this._updatedBy = updatedBy;
    }
    this.updatedAt = new Date();
  }

  public reject(updatedBy?: string | null): void {
    this._status = ConversationMemberStatus.REJECTED;
    if (updatedBy !== undefined) {
      this._updatedBy = updatedBy;
    }
    this.updatedAt = new Date();
  }

  public changeRole(role: ConversationMemberRole): void {
    this._role = role;
    this.updatedAt = new Date();
  }

  public updateLastSeenMessage(messageId: string): void {
    this._lastSeenMessageId = messageId;
    this.updatedAt = new Date();
  }

  public updateLastMessage(messageId: string): void {
    this._lastMessageId = messageId;
    this.updatedAt = new Date();
  }

  public softDelete(): void {
    this._deletedAt = new Date();
    this.updatedAt = new Date();
  }

  public restore(): void {
    this._deletedAt = undefined;
    this.updatedAt = new Date();
  }
}
