import { Test, TestingModule } from '@nestjs/testing';
import { GetGroupJoinRequestsHandler } from './get-group-join-requests.handler';
import { GetGroupJoinRequestsQuery } from './get-group-join-requests.query';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { ConversationReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import {
  GroupAdminRequiredException,
  NotAGroupConversationException,
} from '@modules/chat/domain/chat.exceptions';
import { PaginationOptions } from '@common/pagination/pagination.interface';

describe('GetGroupJoinRequestsHandler', () => {
  let handler: GetGroupJoinRequestsHandler;
  let queryRepo: jest.Mocked<ConversationReadRepositoryPort>;

  const pagination: PaginationOptions = {
    page: 1,
    pageSize: 15,
    offset: 0,
    limit: 15,
  };

  const buildConversation = (
    role: ConversationMemberRole,
    type = ConversationType.GROUP,
  ): ConversationReadDto => ({
    id: 'conv-1',
    type,
    identifier: 'identifier',
    title: 'Team',
    picture: null,
    updatedBy: null,
    notSeenCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: null,
    members: [
      {
        id: 'member-1',
        userId: 'admin-1',
        role,
        status: ConversationMemberStatus.ACTIVE,
        lastSeenMessageId: null,
        lastSeenMessage: null,
        lastMessageId: null,
        updatedBy: null,
      },
    ],
  });

  beforeEach(async () => {
    queryRepo = {
      getUserConversationById: jest.fn(),
      getGroupJoinRequests: jest.fn(),
    } as unknown as jest.Mocked<ConversationReadRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGroupJoinRequestsHandler,
        { provide: ConversationReadRepositoryPort, useValue: queryRepo },
      ],
    }).compile();

    handler = module.get(GetGroupJoinRequestsHandler);
  });

  it('returns pending requests for an active group admin', async () => {
    const conversation = buildConversation(ConversationMemberRole.ADMIN);
    const pendingRequests = {
      data: [],
      meta: {
        page: 1,
        pageSize: 15,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };

    queryRepo.getUserConversationById.mockResolvedValue(conversation);
    queryRepo.getGroupJoinRequests.mockResolvedValue(pendingRequests);

    const result = await handler.execute(
      new GetGroupJoinRequestsQuery('conv-1', 'admin-1', pagination),
    );

    expect(queryRepo.getGroupJoinRequests).toHaveBeenCalledWith(
      'conv-1',
      pagination,
    );
    expect(result).toEqual(pendingRequests);
  });

  it('rejects a non-admin member', async () => {
    queryRepo.getUserConversationById.mockResolvedValue(
      buildConversation(ConversationMemberRole.USER),
    );

    await expect(
      handler.execute(
        new GetGroupJoinRequestsQuery('conv-1', 'admin-1', pagination),
      ),
    ).rejects.toThrow(GroupAdminRequiredException);

    expect(queryRepo.getGroupJoinRequests).not.toHaveBeenCalled();
  });

  it('rejects a direct conversation', async () => {
    queryRepo.getUserConversationById.mockResolvedValue(
      buildConversation(ConversationMemberRole.ADMIN, ConversationType.DIRECT),
    );

    await expect(
      handler.execute(
        new GetGroupJoinRequestsQuery('conv-1', 'admin-1', pagination),
      ),
    ).rejects.toThrow(NotAGroupConversationException);
  });
});
