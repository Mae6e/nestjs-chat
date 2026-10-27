import { Test, TestingModule } from '@nestjs/testing';
import { RemoveGroupMemberHandler } from './remove-group-member.handler';
import { RemoveGroupMemberCommand } from './remove-group-member.command';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import {
  CannotRemoveSelfException,
  GroupOwnerCannotBeRemovedException,
} from '@modules/chat/domain/chat.exceptions';

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

describe('RemoveGroupMemberHandler', () => {
  let handler: RemoveGroupMemberHandler;
  let commandRepo: jest.Mocked<ConversationRepositoryPort>;

  beforeEach(async () => {
    commandRepo = {
      getConversationById: jest.fn(),
      softDeleteMember: jest.fn().mockResolvedValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveGroupMemberHandler,
        { provide: ConversationRepositoryPort, useValue: commandRepo },
      ],
    }).compile();

    handler = module.get<RemoveGroupMemberHandler>(RemoveGroupMemberHandler);
  });

  it('records the admin who removed the member as deletedBy', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([
        member('admin', ConversationMemberRole.ADMIN),
        member('user', ConversationMemberRole.USER),
      ]),
    );

    const result = await handler.execute(
      new RemoveGroupMemberCommand(CONVERSATION_ID, 'admin', 'user'),
    );

    expect(result).toBe(true);
    expect(commandRepo.softDeleteMember).toHaveBeenCalledWith(
      CONVERSATION_ID,
      'user',
      'admin',
    );
  });

  it('does not let an admin remove themselves', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([
        member('owner', ConversationMemberRole.OWNER),
        member('admin', ConversationMemberRole.ADMIN),
      ]),
    );

    await expect(
      handler.execute(
        new RemoveGroupMemberCommand(CONVERSATION_ID, 'admin', 'admin'),
      ),
    ).rejects.toThrow(CannotRemoveSelfException);

    expect(commandRepo.softDeleteMember).not.toHaveBeenCalled();
  });

  it('does not let the owner be removed', async () => {
    commandRepo.getConversationById.mockResolvedValue(
      groupWith([
        member('owner', ConversationMemberRole.OWNER),
        member('admin', ConversationMemberRole.ADMIN),
      ]),
    );

    await expect(
      handler.execute(
        new RemoveGroupMemberCommand(CONVERSATION_ID, 'admin', 'owner'),
      ),
    ).rejects.toThrow(GroupOwnerCannotBeRemovedException);

    expect(commandRepo.softDeleteMember).not.toHaveBeenCalled();
  });
});
