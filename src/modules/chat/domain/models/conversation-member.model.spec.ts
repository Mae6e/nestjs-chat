import { ConversationMemberEntity } from './conversation-member.model';
import { ConversationEntity } from './conversation.model';
import { MessageEntity } from './message.model';
import { ConversationMemberRole } from '../enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '../enums/conversation-member-status.enum';

describe('ConversationMemberEntity', () => {
  it('should create correctly', () => {
    const member = ConversationMemberEntity.create('user-1', 'conv-1');
    expect(member.id).toBeDefined();
    expect(member.userId).toBe('user-1');
    expect(member.conversationId).toBe('conv-1');
    expect(member.role).toBe(ConversationMemberRole.USER);
    expect(member.status).toBe(ConversationMemberStatus.ACTIVE);
  });

  it('should reconstruct correctly', () => {
    const date = new Date();
    const member = ConversationMemberEntity.reconstruct(
      'id-1',
      'user-1',
      ConversationMemberRole.USER,
      ConversationMemberStatus.ACTIVE,
      'conv-1',
      'msg-1',
      'msg-2',
      date,
      date,
    );
    expect(member.id).toBe('id-1');
    expect(member.lastSeenMessageId).toBe('msg-1');
    expect(member.lastMessageId).toBe('msg-2');
  });

  it('should load properties correctly', () => {
    const member = ConversationMemberEntity.create('u-1', 'c-1');
    const conv = {} as Partial<ConversationEntity>;
    const msg = {} as Partial<MessageEntity>;

    member.loadConversation(conv);
    member.loadLastSeenMessage(msg);
    member.loadLastMessage(msg);
    member.loadNotSeenCount(5);

    expect(member.conversation).toBe(conv);
    expect(member.lastSeenMessage).toBe(msg);
    expect(member.lastMessage).toBe(msg);
    expect(member.notSeenCount).toBe(5);
  });

  it('should update and soft delete', () => {
    const member = ConversationMemberEntity.create('u-1', 'c-1');
    member.updateLastSeenMessage('new-seen');
    expect(member.lastSeenMessageId).toBe('new-seen');

    member.updateLastMessage('new-last');
    expect(member.lastMessageId).toBe('new-last');

    member.softDelete('admin-1');
    expect(member.deletedAt).toBeDefined();
    expect(member.deletedBy).toBe('admin-1');

    member.restore();
    expect(member.deletedAt).toBeUndefined();
    expect(member.deletedBy).toBeNull();
  });

  it('should record the admin who approved or rejected the request', () => {
    const member = ConversationMemberEntity.create(
      'u-1',
      'c-1',
      ConversationMemberRole.USER,
      ConversationMemberStatus.PENDING,
    );

    member.approve('admin-1');
    expect(member.status).toBe(ConversationMemberStatus.ACTIVE);
    expect(member.updatedBy).toBe('admin-1');

    member.reject('admin-2');
    expect(member.status).toBe(ConversationMemberStatus.REJECTED);
    expect(member.updatedBy).toBe('admin-2');
  });
});
