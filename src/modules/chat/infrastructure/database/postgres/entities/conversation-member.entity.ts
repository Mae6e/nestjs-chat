import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '@modules/chat/infrastructure/database/postgres/entities/conversation.entity';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

@Entity({ schema: 'chat', name: 'conversation_members' })
@Index(
  'conversation_members_conversation_user_uniq',
  ['conversation_id', 'user_id'],
  { unique: true },
)
export class ConversationMember {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 24 })
  @Index('conversation_members_user_id_idx')
  user_id: string;

  @Column({
    type: 'enum',
    enum: ConversationMemberRole,
    default: ConversationMemberRole.USER,
  })
  role: ConversationMemberRole;

  @Column({
    type: 'enum',
    enum: ConversationMemberStatus,
    default: ConversationMemberStatus.ACTIVE,
  })
  @Index('conversation_members_status_idx')
  status: ConversationMemberStatus;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'uuid', nullable: true })
  last_seen_message_id: string;

  @Column({ type: 'uuid', nullable: true })
  last_message_id: string;

  @Column({ type: 'char', length: 24, nullable: true })
  updated_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  @ManyToOne(() => Conversation, (c) => c.conversationMembers, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id', referencedColumnName: 'id' })
  conversation: Conversation;

  @ManyToOne(() => Message, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'last_seen_message_id', referencedColumnName: 'id' })
  lastSeenMessage: Message;

  @ManyToOne(() => Message, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'last_message_id', referencedColumnName: 'id' })
  lastMessage: Message;

  static fromDomain(entity: ConversationMemberEntity): ConversationMember {
    if (!entity) return null;

    const conversationMember = new ConversationMember();
    conversationMember.id = entity.id;
    conversationMember.user_id = entity.userId;
    conversationMember.role = entity.role;
    conversationMember.status = entity.status;
    conversationMember.conversation_id = entity.conversationId;
    conversationMember.last_seen_message_id = entity.lastSeenMessageId;
    conversationMember.last_message_id = entity.lastMessageId;
    conversationMember.updated_by = entity.updatedBy;
    conversationMember.created_at = entity.createdAt;
    conversationMember.updated_at = entity.updatedAt;
    conversationMember.deleted_at = entity.deletedAt;

    return conversationMember;
  }

  static toDomain(
    conversationMember: ConversationMember,
  ): ConversationMemberEntity {
    if (!conversationMember) return null;

    const entity = ConversationMemberEntity.reconstruct(
      conversationMember.id,
      conversationMember.user_id,
      conversationMember.role,
      conversationMember.status,
      conversationMember.conversation_id,
      conversationMember.last_seen_message_id,
      conversationMember.last_message_id,
      conversationMember.created_at,
      conversationMember.updated_at,
      conversationMember.deleted_at,
      conversationMember.updated_by ?? null,
    );

    if (conversationMember.conversation) {
      entity.loadConversation(
        Conversation.toDomain(conversationMember.conversation),
      );
    }
    if (conversationMember.lastSeenMessage) {
      entity.loadLastSeenMessage(
        Message.toDomain(conversationMember.lastSeenMessage),
      );
    }
    if (conversationMember.lastMessage) {
      entity.loadLastMessage(Message.toDomain(conversationMember.lastMessage));
    }

    return entity;
  }
}
