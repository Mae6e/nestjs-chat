import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMember } from '@modules/chat/infrastructure/database/postgres/entities/conversation-member.entity';

@Entity({ schema: 'chat', name: 'conversations' })
export class Conversation {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', nullable: true })
  picture: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index('conversations_identifier_uniq', { unique: true })
  identifier: string | null;

  /**
   * Deterministic key (`smallerUserId:largerUserId`) for DIRECT conversations.
   * A partial unique index keeps one active conversation per pair; legacy rows
   * and soft-deleted conversations are excluded.
   */
  @Column({ type: 'varchar', length: 49, nullable: true })
  @Index('conversations_direct_key_uniq', {
    unique: true,
    where: `"direct_key" IS NOT NULL AND "deleted_at" IS NULL`,
  })
  direct_key: string | null;

  @Column({ type: 'char', length: 24, nullable: true })
  created_by: string | null;

  @Column({ type: 'char', length: 24, nullable: true })
  updated_by: string | null;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date | null;

  @OneToMany(() => Message, (m) => m.conversation, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  messages: Message[];

  @OneToMany(() => ConversationMember, (cm) => cm.conversation)
  conversationMembers: ConversationMember[];

  static fromDomain(entity: ConversationEntity): Conversation {
    if (!entity) return null;

    const conversation = new Conversation();
    conversation.id = entity.id;
    conversation.title = entity.title;
    conversation.description = entity.description;
    conversation.picture = entity.picture;
    conversation.identifier = entity.identifier;
    conversation.direct_key = entity.directKey;
    conversation.created_by = entity.createdBy;
    conversation.updated_by = entity.updatedBy;
    conversation.type = entity.type;
    conversation.created_at = entity.createdAt;
    conversation.updated_at = entity.updatedAt;
    conversation.deleted_at = entity.deletedAt;

    if (entity.messages && entity.messages.length > 0) {
      conversation.messages = entity.messages.map((m) => Message.fromDomain(m));
    }

    if (entity.members && entity.members.length > 0) {
      conversation.conversationMembers = entity.members.map((cm) =>
        ConversationMember.fromDomain(cm),
      );
    }

    return conversation;
  }

  static toDomain(conversation: Conversation): ConversationEntity {
    if (!conversation) return null;

    const entity = ConversationEntity.reconstruct(
      conversation.id,
      conversation.type,
      conversation.title,
      conversation.picture,
      conversation.description,
      conversation.identifier,
      conversation.created_at,
      conversation.updated_at,
      conversation.created_by,
      conversation.updated_by,
      conversation.deleted_at,
      conversation.direct_key ?? null,
    );

    if (conversation.messages) {
      entity.loadMessages(
        conversation.messages.map((m) => Message.toDomain(m)),
      );
    }

    if (conversation.conversationMembers) {
      entity.loadMembers(
        conversation.conversationMembers.map((cm) =>
          ConversationMember.toDomain(cm),
        ),
      );
    }

    return entity;
  }
}
