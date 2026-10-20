import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupJoinRequestAction,
  RespondToJoinRequestCommand,
} from './respond-to-join-request.command';
import { RespondToJoinRequestHandler } from './respond-to-join-request.handler';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import {
  GroupAdminRequiredException,
  GroupJoinRequestNotFoundException,
} from '@modules/chat/domain/chat.exceptions';

describe('RespondToJoinRequestHandler', () => {
  let handler: RespondToJoinRequestHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;

  const buildGroupWithPending = (requesterId = 'user-2') => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    conversation.addMember(
      ConversationMemberEntity.create(
        requesterId,
        conversation.id,
        ConversationMemberRole.USER,
        ConversationMemberStatus.PENDING,
      ),
    );
    return conversation;
  };

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
      saveMember: jest.fn(async (member) => member),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RespondToJoinRequestHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
      ],
    }).compile();

    handler = module.get(RespondToJoinRequestHandler);
  });

  it('rejects when the actor is not an admin', async () => {
    const conversation = buildGroupWithPending();
    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new RespondToJoinRequestCommand(
          conversation.id,
          'user-2',
          'user-2',
          GroupJoinRequestAction.APPROVE,
        ),
      ),
    ).rejects.toThrow(GroupAdminRequiredException);
  });

  it('approves a pending join request', async () => {
    const conversation = buildGroupWithPending();
    commandRepo.getConversationById.mockResolvedValue(conversation);

    const member = await handler.execute(
      new RespondToJoinRequestCommand(
        conversation.id,
        'admin',
        'user-2',
        GroupJoinRequestAction.APPROVE,
      ),
    );

    expect(member.status).toBe(ConversationMemberStatus.ACTIVE);
    expect(member.isActive()).toBe(true);
  });

  it('rejects a pending join request', async () => {
    const conversation = buildGroupWithPending();
    commandRepo.getConversationById.mockResolvedValue(conversation);

    const member = await handler.execute(
      new RespondToJoinRequestCommand(
        conversation.id,
        'admin',
        'user-2',
        GroupJoinRequestAction.REJECT,
      ),
    );

    expect(member.status).toBe(ConversationMemberStatus.REJECTED);
  });

  it('throws when there is no pending request', async () => {
    const conversation = ConversationEntity.createGroup('admin', 'Team');
    commandRepo.getConversationById.mockResolvedValue(conversation);

    await expect(
      handler.execute(
        new RespondToJoinRequestCommand(
          conversation.id,
          'admin',
          'user-2',
          GroupJoinRequestAction.APPROVE,
        ),
      ),
    ).rejects.toThrow(GroupJoinRequestNotFoundException);
  });
});
