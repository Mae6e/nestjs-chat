import { MessageEntity } from '@modules/chat/domain/models/message.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { v7 as uuidv7 } from 'uuid';

import { AggregateRoot } from '@common/domain/aggregate-root';
import { ConversationMemberRole } from '../enums/conversation-member-role.enum';

export class ConversationEntity extends AggregateRoot<string> {
  private _title: string | null;
  private _picture: string | null;
  private _description: string | null;
  private readonly _identifier: string | null;
  private readonly _type: ConversationType;
  private readonly _createdBy: string | null;
  private _updatedBy: string | null;
  private _deletedAt?: Date;

  // Domain associations
  private _members: ConversationMemberEntity[] = [];
  private _messages: MessageEntity[] = [];
  private _lastMessage?: MessageEntity;

  public get members() {
    return [...this._members];
  }
  public get messages() {
    return [...this._messages];
  }
  public get lastMessage() {
    return this._lastMessage;
  }

  // Domain Behaviors
  public addMember(member: ConversationMemberEntity): void {
    if (this._type === ConversationType.DIRECT && this._members.length >= 2) {
      throw new Error('Direct conversations can only have 2 members');
    }
    if (!this._members.some((m) => m.userId === member.userId)) {
      this._members.push(member);
      this.updatedAt = new Date();
    }
  }

  /**
   * Removes a member from the in-memory aggregate. Persisting the removal is
   * handled by the repository (soft delete).
   */
  public removeMember(userId: string): void {
    const member = this.getMember(userId);
    if (!member) {
      return;
    }
    member.softDelete();
    this._members = this._members.filter((m) => m.userId !== userId);
    this.updatedAt = new Date();
  }

  public getMember(userId: string): ConversationMemberEntity | undefined {
    return this._members.find((m) => m.userId === userId);
  }

  public isMember(userId: string): boolean {
    const member = this.getMember(userId);
    return !!member && member.isActive();
  }

  public getActiveMembers(): ConversationMemberEntity[] {
    return this._members.filter((m) => m.isActive());
  }

  public getAdmins(): ConversationMemberEntity[] {
    return this._members.filter((m) => m.isAdmin());
  }

  public updateInfo(
    title?: string | null,
    picture?: string | null,
    description?: string | null,
    updatedBy?: string | null,
  ): void {
    if (title !== undefined) {
      this._title = title;
    }
    if (picture !== undefined) {
      this._picture = picture;
    }
    if (description !== undefined) {
      this._description = description;
    }
    if (updatedBy !== undefined) {
      this._updatedBy = updatedBy;
    }
    this.updatedAt = new Date();
  }

  public addMessage(message: MessageEntity): void {
    this._messages.push(message);
    this._lastMessage = message;
    this.updatedAt = new Date();
  }

  // Infrastructure Loaders (For Mappers Only)
  public loadMembers(members: ConversationMemberEntity[]): void {
    this._members = members;
  }
  public loadMessages(messages: MessageEntity[]): void {
    this._messages = messages;
  }
  public loadLastMessage(message: MessageEntity): void {
    this._lastMessage = message;
  }

  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    type: ConversationType,
    title: string | null = null,
    picture: string | null = null,
    description: string | null = null,
    identifier: string | null = null,
    createdBy: string | null = null,
    updatedBy: string | null = null,
    deletedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._type = type;
    this._title = title;
    this._picture = picture;
    this._description = description;
    this._identifier = identifier;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
    this._deletedAt = deletedAt;
  }

  public static createDirect(
    userId: string,
    targetUserId: string,
  ): ConversationEntity {
    const id = uuidv7();
    const conversation = new ConversationEntity(
      id,
      new Date(),
      new Date(),
      ConversationType.DIRECT,
      null,
      null,
      uuidv7(),
    );

    conversation.addMember(
      ConversationMemberEntity.create(userId, id, ConversationMemberRole.USER),
    );
    conversation.addMember(
      ConversationMemberEntity.create(
        targetUserId,
        id,
        ConversationMemberRole.USER,
      ),
    );

    // TODO: Apply ConversationCreatedEvent here

    return conversation;
  }

  /**
   * Creates a GROUP conversation. The creator becomes the group ADMIN.
   *
   * `memberIds` is an internal seeding helper (mainly for tests); the public
   * group creation flow passes none, so only the creator is added and everyone
   * else has to go through the join-request flow.
   */
  public static createGroup(
    creatorId: string,
    title: string,
    memberIds: string[] = [],
    picture: string | null = null,
    description: string | null = null,
  ): ConversationEntity {
    const id = uuidv7();
    const conversation = new ConversationEntity(
      id,
      new Date(),
      new Date(),
      ConversationType.GROUP,
      title,
      picture,
      description,
      uuidv7(),
      creatorId,
      creatorId,
    );

    conversation.addMember(
      ConversationMemberEntity.create(
        creatorId,
        id,
        ConversationMemberRole.ADMIN,
      ),
    );

    for (const memberId of memberIds) {
      if (memberId === creatorId) {
        continue;
      }
      conversation.addMember(
        ConversationMemberEntity.create(
          memberId,
          id,
          ConversationMemberRole.USER,
        ),
      );
    }

    return conversation;
  }

  public static reconstruct(
    id: string,
    type: ConversationType,
    title: string | null,
    picture: string | null,
    description: string | null,
    identifier: string | null,
    createdAt: Date,
    updatedAt: Date,
    createdBy: string | null = null,
    updatedBy: string | null = null,
    deletedAt?: Date,
  ): ConversationEntity {
    return new ConversationEntity(
      id,
      createdAt,
      updatedAt,
      type,
      title,
      picture,
      description,
      identifier,
      createdBy,
      updatedBy,
      deletedAt,
    );
  }

  public get type(): ConversationType {
    return this._type;
  }
  public get title(): string | null {
    return this._title;
  }
  public get picture(): string | null {
    return this._picture;
  }
  public get description(): string | null {
    return this._description;
  }
  public get identifier(): string | null {
    return this._identifier;
  }
  public get createdBy(): string | null {
    return this._createdBy;
  }
  public get updatedBy(): string | null {
    return this._updatedBy;
  }
  public get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  public markAsRead(userId: string, messageId: string): void {
    const member = this.members.find((m) => m.userId === userId);
    if (!member) {
      throw new Error(`User ${userId} is not a member`);
    }
    if (member.lastSeenMessageId === messageId) {
      throw new Error(`Message ${messageId} is already marked as read`);
    }
    member.updateLastSeenMessage(messageId);
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
