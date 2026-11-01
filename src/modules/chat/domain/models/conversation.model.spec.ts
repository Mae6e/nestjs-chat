import { ConversationEntity } from './conversation.model';
import { ConversationType } from '../enums/conversation-type.enum';
import { ConversationMemberEntity } from './conversation-member.model';
import { MessageEntity } from './message.model';
import { MessageType } from '../enums/chat-type.enum';
import { ConversationMemberRole } from '../enums/conversation-member-role.enum';

describe('ConversationEntity', () => {
  it('should create direct correctly and add members', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    expect(conv.id).toBeDefined();
    expect(conv.type).toBe(ConversationType.DIRECT);
    expect(conv.members).toHaveLength(2);
    expect(conv.members[0].userId).toBe('u-1');
    expect(conv.members[1].userId).toBe('u-2');
  });

  it('should reconstruct correctly', () => {
    const date = new Date();
    const conv = ConversationEntity.reconstruct(
      'c-1',
      ConversationType.DIRECT,
      'title',
      'pic',
      null,
      'ident',
      date,
      date,
    );
    expect(conv.id).toBe('c-1');
    expect(conv.type).toBe(ConversationType.DIRECT);
    expect(conv.title).toBe('title');
    expect(conv.picture).toBe('pic');
    expect(conv.identifier).toBe('ident');
  });

  it('should not add more than 2 members to direct conversation', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    expect(() =>
      conv.addMember(ConversationMemberEntity.create('u-3', conv.id)),
    ).toThrow('Direct conversations can only have 2 members');
  });

  it('should not add duplicate members', () => {
    const conv = ConversationEntity.reconstruct(
      'c-1',
      ConversationType.DIRECT,
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
    );
    const member = ConversationMemberEntity.create('u-1', conv.id);
    conv.addMember(member);
    conv.addMember(member);
    expect(conv.members).toHaveLength(1);
  });

  it('should add message and update lastMessage', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    const msg = MessageEntity.create('test', MessageType.TEXT, 'u-1', conv.id);
    conv.addMessage(msg);
    expect(conv.messages).toHaveLength(1);
    expect(conv.lastMessage).toBe(msg);
  });

  it('should load properties correctly', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    const msg = MessageEntity.create('test', MessageType.TEXT, 'u-1', conv.id);
    conv.loadMembers([]);
    expect(conv.members).toHaveLength(0);
    conv.loadMessages([msg]);
    expect(conv.messages).toHaveLength(1);
    conv.loadLastMessage(msg);
    expect(conv.lastMessage).toBe(msg);
  });

  it('should mark as read', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    conv.markAsRead('u-1', 'msg-1');
    expect(
      conv.members.find((m) => m.userId === 'u-1')?.lastSeenMessageId,
    ).toBe('msg-1');
  });

  it('should soft delete and restore', () => {
    const conv = ConversationEntity.createDirect('u-1', 'u-2');
    conv.softDelete();
    expect(conv.deletedAt).toBeDefined();
    conv.restore();
    expect(conv.deletedAt).toBeUndefined();
  });

  describe('groups', () => {
    it('should create a group with the creator as admin and invitees as users', () => {
      const conv = ConversationEntity.createGroup('creator', 'Team', [
        'u-2',
        'u-3',
        'creator',
      ]);

      expect(conv.type).toBe(ConversationType.GROUP);
      expect(conv.title).toBe('Team');
      expect(conv.createdBy).toBe('creator');
      expect(conv.updatedBy).toBe('creator');
      expect(conv.members).toHaveLength(3);

      const creator = conv.getMember('creator');
      expect(creator?.role).toBe(ConversationMemberRole.ADMIN);
      expect(creator?.isAdmin()).toBe(true);

      expect(conv.getMember('u-2')?.role).toBe(ConversationMemberRole.USER);
      expect(conv.getActiveMembers()).toHaveLength(3);
      expect(conv.getAdmins()).toHaveLength(1);
    });

    it('should update group info', () => {
      const conv = ConversationEntity.createGroup('creator', 'Team');
      conv.updateInfo('New team', 'pic.png', null, 'admin-2');

      expect(conv.title).toBe('New team');
      expect(conv.picture).toBe('pic.png');
      expect(conv.description).toBeNull();
      expect(conv.updatedBy).toBe('admin-2');
    });

    it('should keep the description when updateInfo is called without one', () => {
      const conv = ConversationEntity.createGroup(
        'creator',
        'Team',
        [],
        null,
        'Existing description',
      );

      conv.updateInfo('New team', 'pic.png', undefined, 'admin-2');

      expect(conv.description).toBe('Existing description');
    });

    it('should remove members using a soft delete', () => {
      const conv = ConversationEntity.createGroup('creator', 'Team', ['u-2']);
      conv.removeMember('u-2');

      expect(conv.getMember('u-2')).toBeUndefined();
      expect(conv.getActiveMembers()).toHaveLength(1);
    });
  });
});
