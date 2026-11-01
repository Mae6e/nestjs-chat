import { Test, TestingModule } from '@nestjs/testing';
import { LeaveGroupHandler } from './leave-group.handler';
import { LeaveGroupCommand } from './leave-group.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import {
  ConversationNotFoundException,
  GroupMemberNotFoundException,
} from '@modules/chat/domain/chat.exceptions';

const CONVERSATION_ID = 'conversation-1';

function member(
  userId: string,
  role: ConversationMemberRole,
  createdAt: Date,
): ConversationMemberEntity {
  return ConversationMemberEntity.reconstruct(
    `member-${userId}`,
    userId,
    role,
    ConversationMemberStatus.ACTIVE,
    CONVERSATION_ID,
    undefined,
    undefined,
    createdAt,
    createdAt,
  );
}

function groupWith(members: ConversationMemberEntity[]): ConversationEntity {
  const conversation = ConversationEntity.reconstruct(
    CONVERSATION_ID,
    ConversationType.GROUP,
    'Team',
    null,
    null,
    'identifier',
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-01-01T00:00:00.000Z'),
  );
  conversation.loadMembers(members);
  return conversation;
}

describe('LeaveGroupHandler', () => {
  let handler: LeaveGroupHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
      saveMember: jest.fn(),
      softDeleteMember: jest.fn().mockResolvedValue(true),
      deleteConversation: jest.fn().mockResolvedValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveGroupHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
      ],
    }).compile();

    handler = module.get<LeaveGroupHandler>(LeaveGroupHandler);
  });

  it('promotes the oldest active member to admin when the last admin leaves', async () => {
    const owner = member(
      'owner',
      ConversationMemberRole.OWNER,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const older = member(
      'older',
      ConversationMemberRole.USER,
      new Date('2026-01-02T00:00:00.000Z'),
    );
    const newer = member(
      'newer',
      ConversationMemberRole.USER,
      new Date('2026-01-03T00:00:00.000Z'),
    );
    const conversation = groupWith([owner, older, newer]);

    commandRepo.getConversationById.mockResolvedValue(conversation);

    const result = await handler.execute(
      new LeaveGroupCommand(CONVERSATION_ID, 'owner'),
    );

    expect(result.removed).toBe(true);
    expect(result.promotedAdminId).toBe('older');
    expect(result.conversationDeleted).toBe(false);
    expect(older.role).toBe(ConversationMemberRole.ADMIN);
    expect(newer.role).toBe(ConversationMemberRole.USER);
    expect(commandRepo.saveMember).toHaveBeenCalledWith(older);
    expect(commandRepo.softDeleteMember).toHaveBeenCalledWith(
      CONVERSATION_ID,
      'owner',
      'owner',
    );
  });

  it('does not promote anyone while another admin remains', async () => {
    const admin = member(
      'admin',
      ConversationMemberRole.ADMIN,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const otherAdmin = member(
      'other-admin',
      ConversationMemberRole.ADMIN,
      new Date('2026-01-02T00:00:00.000Z'),
    );
    const conversation = groupWith([admin, otherAdmin]);

    commandRepo.getConversationById.mockResolvedValue(conversation);

    const result = await handler.execute(
      new LeaveGroupCommand(CONVERSATION_ID, 'admin'),
    );

    expect(result.promotedAdminId).toBeUndefined();
    expect(otherAdmin.role).toBe(ConversationMemberRole.ADMIN);
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
    expect(commandRepo.softDeleteMember).toHaveBeenCalledWith(
      CONVERSATION_ID,
      'admin',
      'admin',
    );
  });

  it('does not promote anyone when a regular member leaves', async () => {
    const owner = member(
      'owner',
      ConversationMemberRole.OWNER,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const user = member(
      'user',
      ConversationMemberRole.USER,
      new Date('2026-01-02T00:00:00.000Z'),
    );
    const conversation = groupWith([owner, user]);

    commandRepo.getConversationById.mockResolvedValue(conversation);

    const result = await handler.execute(
      new LeaveGroupCommand(CONVERSATION_ID, 'user'),
    );

    expect(result.promotedAdminId).toBeUndefined();
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
    expect(commandRepo.softDeleteMember).toHaveBeenCalledWith(
      CONVERSATION_ID,
      'user',
      'user',
    );
  });

  it('deletes the group when the last remaining admin leaves an empty group', async () => {
    const owner = member(
      'owner',
      ConversationMemberRole.OWNER,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const conversation = groupWith([owner]);

    commandRepo.getConversationById.mockResolvedValue(conversation);

    const result = await handler.execute(
      new LeaveGroupCommand(CONVERSATION_ID, 'owner'),
    );

    expect(result.removed).toBe(true);
    expect(result.conversationDeleted).toBe(true);
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
    expect(commandRepo.deleteConversation).toHaveBeenCalledWith(
      CONVERSATION_ID,
    );
    expect(commandRepo.softDeleteMember).not.toHaveBeenCalled();
  });

  it('deletes the group when its last regular member leaves', async () => {
    const user = member(
      'user',
      ConversationMemberRole.USER,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const conversation = groupWith([user]);

    commandRepo.getConversationById.mockResolvedValue(conversation);

    const result = await handler.execute(
      new LeaveGroupCommand(CONVERSATION_ID, 'user'),
    );

    expect(result.removed).toBe(true);
    expect(result.conversationDeleted).toBe(true);
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
    expect(commandRepo.deleteConversation).toHaveBeenCalledWith(
      CONVERSATION_ID,
    );
    expect(commandRepo.softDeleteMember).not.toHaveBeenCalled();
  });

  it('throws when the conversation does not exist', async () => {
    commandRepo.getConversationById.mockResolvedValue(null);

    await expect(
      handler.execute(new LeaveGroupCommand(CONVERSATION_ID, 'user')),
    ).rejects.toThrow(ConversationNotFoundException);
  });

  it('throws when the user is not an active member', async () => {
    const conversation = groupWith([]);
    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(new LeaveGroupCommand(CONVERSATION_ID, 'stranger')),
    ).rejects.toThrow(GroupMemberNotFoundException);
  });
});
