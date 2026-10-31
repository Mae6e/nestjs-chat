import { Test, TestingModule } from '@nestjs/testing';
import { RequestJoinGroupHandler } from './request-join-group.handler';
import { RequestJoinGroupCommand } from './request-join-group.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import {
  ConversationNotFoundException,
  GroupMemberAlreadyExistsException,
  GroupMemberLimitExceededException,
  NotAGroupConversationException,
  UserAlreadyInGroupException,
} from '@modules/chat/domain/chat.exceptions';
import { MAX_GROUP_MEMBERS } from '@modules/chat/domain/constants/group.constants';

describe('RequestJoinGroupHandler', () => {
  let handler: RequestJoinGroupHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
      getMembership: jest.fn(),
      countMembers: jest.fn(async () => 0),
      hasActiveGroupMembership: jest.fn(async () => false),
      saveMember: jest.fn(async (member) => member),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestJoinGroupHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
      ],
    }).compile();

    handler = module.get(RequestJoinGroupHandler);
  });

  it('throws when the conversation does not exist', async () => {
    commandRepo.getConversationById.mockResolvedValue(null);

    await expect(
      handler.execute(new RequestJoinGroupCommand('conv-1', 'user-2')),
    ).rejects.toThrow(ConversationNotFoundException);
  });

  it('throws when the conversation is not a group', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      ConversationEntity.createDirect('user-1', 'user-2'),
    );

    await expect(
      handler.execute(new RequestJoinGroupCommand('conv-1', 'user-3')),
    ).rejects.toThrow(NotAGroupConversationException);
  });

  it('creates a pending membership for a new requester', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    commandRepo.getConversationById.mockResolvedValue(conversation);
    commandRepo.getMembership.mockResolvedValue(null);

    const member = await handler.execute(
      new RequestJoinGroupCommand(conversation.id, 'user-2'),
    );

    expect(member.status).toBe(ConversationMemberStatus.PENDING);
    expect(member.userId).toBe('user-2');
    expect(commandRepo.saveMember).toHaveBeenCalled();
  });

  it('always resets the role to USER, even for a previous admin rejoining', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    commandRepo.getConversationById.mockResolvedValue(conversation);

    const previousAdmin = ConversationMemberEntity.create(
      'user-2',
      conversation.id,
      ConversationMemberRole.ADMIN,
      ConversationMemberStatus.ACTIVE,
    );
    previousAdmin.softDelete();
    commandRepo.getMembership.mockResolvedValue(previousAdmin);

    const member = await handler.execute(
      new RequestJoinGroupCommand(conversation.id, 'user-2'),
    );

    expect(member.status).toBe(ConversationMemberStatus.PENDING);
    expect(member.role).toBe(ConversationMemberRole.USER);
  });

  it('throws when the user is already an active member', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team', [
      'user-2',
    ]);
    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(new RequestJoinGroupCommand(conversation.id, 'user-2')),
    ).rejects.toThrow(GroupMemberAlreadyExistsException);
  });

  it('throws when the user already belongs to another group', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    commandRepo.getConversationById.mockResolvedValue(conversation);
    commandRepo.getMembership.mockResolvedValue(null);
    commandRepo.hasActiveGroupMembership.mockResolvedValue(true);

    await expect(
      handler.execute(new RequestJoinGroupCommand(conversation.id, 'user-2')),
    ).rejects.toThrow(UserAlreadyInGroupException);

    expect(commandRepo.hasActiveGroupMembership).toHaveBeenCalledWith('user-2');
    expect(commandRepo.saveMember).not.toHaveBeenCalled();
  });

  it('throws when the group has reached the member limit', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    commandRepo.getConversationById.mockResolvedValue(conversation);
    commandRepo.getMembership.mockResolvedValue(null);
    commandRepo.countMembers.mockResolvedValue(MAX_GROUP_MEMBERS);

    await expect(
      handler.execute(new RequestJoinGroupCommand(conversation.id, 'user-2')),
    ).rejects.toThrow(GroupMemberLimitExceededException);

    expect(commandRepo.saveMember).not.toHaveBeenCalled();
  });
});
