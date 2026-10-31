import { Test, TestingModule } from '@nestjs/testing';
import { AddGroupMembersHandler } from './add-group-members.handler';
import { AddGroupMembersCommand } from './add-group-members.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { UserAlreadyInGroupException } from '@modules/chat/domain/chat.exceptions';

const CONVERSATION_ID = 'conversation-1';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

function member(
  userId: string,
  role: ConversationMemberRole,
): ConversationMemberEntity {
  return ConversationMemberEntity.reconstruct(
    `member-${userId}`,
    userId,
    role,
    ConversationMemberStatus.ACTIVE,
    CONVERSATION_ID,
    undefined,
    undefined,
    CREATED_AT,
    CREATED_AT,
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
    CREATED_AT,
    CREATED_AT,
  );
  conversation.loadMembers(members);
  return conversation;
}

describe('AddGroupMembersHandler', () => {
  let handler: AddGroupMembersHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;
  let userIntegrationPort: jest.Mocked<UserIntegrationPort>;

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
      getMembership: jest.fn(),
      countMembers: jest.fn(async () => 1),
      hasActiveGroupMembership: jest.fn(async () => false),
      deletePendingMembershipsForUser: jest.fn(async () => 0),
      saveMember: jest.fn(async (m) => m),
    } as any;

    userIntegrationPort = {
      getUsersByIds: jest.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, username: id, avatarIndex: 0 })),
      ),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddGroupMembersHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
        { provide: UserIntegrationPort, useValue: userIntegrationPort },
      ],
    }).compile();

    handler = module.get<AddGroupMembersHandler>(AddGroupMembersHandler);
  });

  it('throws when a user to add already belongs to another group', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([member('admin', ConversationMemberRole.ADMIN)]),
    );
    commandRepo.hasActiveGroupMembership.mockResolvedValue(true);

    await expect(
      handler.execute(
        new AddGroupMembersCommand(CONVERSATION_ID, 'admin', ['user-2']),
      ),
    ).rejects.toThrow(UserAlreadyInGroupException);

    expect(commandRepo.hasActiveGroupMembership).toHaveBeenCalledWith(
      'user-2',
      CONVERSATION_ID,
    );
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
    expect(commandRepo.deletePendingMembershipsForUser).not.toHaveBeenCalled();
  });

  it('adds the member and clears their other pending join requests', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([member('admin', ConversationMemberRole.ADMIN)]),
    );

    const result = await handler.execute(
      new AddGroupMembersCommand(CONVERSATION_ID, 'admin', ['user-2']),
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user-2');
    expect(result[0].isActive()).toBe(true);
    expect(commandRepo.saveMember).toHaveBeenCalledWith(result[0]);
    expect(commandRepo.deletePendingMembershipsForUser).toHaveBeenCalledWith(
      'user-2',
      CONVERSATION_ID,
      'admin',
    );
  });

  it('does not check group membership for users already active here', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([
        member('admin', ConversationMemberRole.ADMIN),
        member('user-2', ConversationMemberRole.USER),
      ]),
    );

    const result = await handler.execute(
      new AddGroupMembersCommand(CONVERSATION_ID, 'admin', ['user-2']),
    );

    expect(result).toHaveLength(0);
    expect(commandRepo.hasActiveGroupMembership).not.toHaveBeenCalled();
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
  });
});
