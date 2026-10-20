import { Test, TestingModule } from '@nestjs/testing';
import { ChatHttpController } from './chat-http.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BlockUserCommand } from '@modules/chat/application/commands/block-user/block-user.command';
import { UnblockUserCommand } from '@modules/chat/application/commands/unblock-user/unblock-user.command';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ChatHttpGuard } from './guards/chat-http.guard';
import {
  FileStoragePort,
  UploadedFilePayload,
} from '@modules/chat/application/ports/file-storage.port';
import { CreateGroupConversationCommand } from '@modules/chat/application/commands/create-group-conversation/create-group-conversation.command';
import { DeleteConversationCommand } from '@modules/chat/application/commands/delete-conversation/delete-conversation.command';
import { UpdateGroupConversationCommand } from '@modules/chat/application/commands/update-group-conversation/update-group-conversation.command';
import { GetUserGroupConversationListQuery } from '@modules/chat/application/queries/get-user-group-conversation-list/get-user-group-conversation-list.query';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { ChatWsGateway } from '@modules/chat/presentation/ws/chat-ws.gateway';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

describe('ChatHttpController', () => {
  let controller: ChatHttpController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let fileStorage: jest.Mocked<FileStoragePort>;
  let conversationRepository: jest.Mocked<ConversationRepositoryPort>;
  let chatWsGateway: jest.Mocked<ChatWsGateway>;

  const pictureFile: UploadedFilePayload = {
    buffer: Buffer.from('image'),
    originalname: 'picture.png',
    mimetype: 'image/png',
    size: 5,
  };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    queryBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<QueryBus>;

    fileStorage = {
      saveGroupPicture: jest.fn(),
      deleteGroupPicture: jest.fn().mockResolvedValue(undefined),
      getGroupPictureUrl: jest.fn((picture: string | null) =>
        picture
          ? picture.startsWith('/')
            ? picture
            : `/uploads/group-pictures/${picture}`
          : null,
      ),
      normalizeGroupPictureKey: jest.fn((picture: string) =>
        picture.replace(/^\/uploads\/group-pictures\//, ''),
      ),
    } as unknown as jest.Mocked<FileStoragePort>;

    conversationRepository = {
      getConversationById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ConversationRepositoryPort>;

    chatWsGateway = {
      server: {},
      serverBroadcast: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ChatWsGateway>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatHttpController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: QueryBus,
          useValue: queryBus,
        },
        {
          provide: FileStoragePort,
          useValue: fileStorage,
        },
        {
          provide: ConversationRepositoryPort,
          useValue: conversationRepository,
        },
        {
          provide: ChatWsGateway,
          useValue: chatWsGateway,
        },
      ],
    })
      .overrideGuard(ChatHttpGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatHttpController>(ChatHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGroupConversationList', () => {
    it('should query group conversations with pagination', async () => {
      const result = {
        data: [],
        meta: {
          page: 2,
          pageSize: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: true,
        },
      };
      queryBus.execute.mockResolvedValue(result);

      const response = await controller.getGroupConversationList(
        { page: 2, pageSize: 10 },
        'auth-user',
      );

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetUserGroupConversationListQuery('auth-user', {
          page: 2,
          pageSize: 10,
          offset: 10,
          limit: 10,
        }),
      );
      expect(response).toEqual(result);
    });

    it('should return stored picture keys as public URLs', async () => {
      queryBus.execute.mockResolvedValue({
        data: [{ id: 'group-1', picture: 'picture.png' }],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      });

      const response = await controller.getGroupConversationList(
        { page: 1, pageSize: 10 },
        'auth-user',
      );

      expect(response.data[0].picture).toBe(
        '/uploads/group-pictures/picture.png',
      );
      expect(response.data[0]).not.toHaveProperty('updatedBy');
    });
  });

  describe('block', () => {
    it('should execute BlockUserCommand and return empty object on success', async () => {
      commandBus.execute.mockResolvedValue(true);

      const result = await controller.block(
        { targetUserId: 'target-1' },
        'auth-user',
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        new BlockUserCommand('auth-user', 'target-1'),
      );
      expect(result).toEqual({});
    });

    it('should throw ConflictException if user is already blocked', async () => {
      commandBus.execute.mockResolvedValue(false);

      await expect(
        controller.block({ targetUserId: 'target-1' }, 'auth-user'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unblock', () => {
    it('should execute UnblockUserCommand and return empty object', async () => {
      commandBus.execute.mockResolvedValue(true);

      const result = await controller.unblock(
        { targetUserId: 'target-1' },
        'auth-user',
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UnblockUserCommand('auth-user', 'target-1'),
      );
      expect(result).toEqual({});
    });
  });

  describe('createGroupConversation', () => {
    it('should create a group with only the creator and the uploaded picture', async () => {
      const conversation = ConversationEntity.createGroup(
        'auth-user',
        'Team',
        [],
        'picture.png',
      );

      commandBus.execute.mockResolvedValue(conversation);
      fileStorage.saveGroupPicture.mockResolvedValue('picture.png');

      const result = await controller.createGroupConversation(
        { title: 'Team' },
        pictureFile,
        'auth-user',
      );

      expect(fileStorage.saveGroupPicture).toHaveBeenCalledWith(pictureFile);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateGroupConversationCommand('auth-user', 'Team', 'picture.png'),
      );
      expect(result).toMatchObject({
        id: conversation.id,
        type: ConversationType.GROUP,
        title: 'Team',
        picture: '/uploads/group-pictures/picture.png',
        role: ConversationMemberRole.ADMIN,
      });
      expect(result).not.toHaveProperty('updatedBy');
      expect(result).not.toHaveProperty('members');
      expect(result).not.toHaveProperty('lastMessage');
    });

    it('should accept an already uploaded picture path without a file', async () => {
      const conversation = ConversationEntity.createGroup(
        'auth-user',
        'Team',
        [],
        'existing.png',
      );

      commandBus.execute.mockResolvedValue(conversation);

      await controller.createGroupConversation(
        { title: 'Team', picture: '/uploads/group-pictures/existing.png' },
        undefined,
        'auth-user',
      );

      expect(fileStorage.saveGroupPicture).not.toHaveBeenCalled();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateGroupConversationCommand('auth-user', 'Team', 'existing.png'),
      );
    });

    it('should delete the uploaded picture when group creation fails', async () => {
      fileStorage.saveGroupPicture.mockResolvedValue('picture.png');
      commandBus.execute.mockRejectedValueOnce(new Error('database down'));

      await expect(
        controller.createGroupConversation(
          { title: 'Team' },
          pictureFile,
          'auth-user',
        ),
      ).rejects.toThrow('database down');

      expect(fileStorage.deleteGroupPicture).toHaveBeenCalledWith(
        'picture.png',
      );
    });

    it('should delete the group when the first message fails', async () => {
      const conversation = ConversationEntity.createGroup('auth-user', 'Team');

      commandBus.execute
        .mockResolvedValueOnce(conversation)
        .mockRejectedValueOnce(new Error('message failed'))
        .mockResolvedValueOnce(undefined);

      await expect(
        controller.createGroupConversation(
          { title: 'Team', content: 'hello' },
          undefined,
          'auth-user',
        ),
      ).rejects.toThrow('message failed');

      expect(commandBus.execute).toHaveBeenNthCalledWith(
        3,
        new DeleteConversationCommand(conversation.id),
      );
    });
  });

  describe('updateGroupConversation', () => {
    it('should update the title and upload a new picture', async () => {
      const conversation = ConversationEntity.createGroup(
        'auth-user',
        'New name',
        [],
        'new.png',
      );

      conversationRepository.getConversationById.mockResolvedValue({
        id: conversation.id,
        picture: '/uploads/group-pictures/old.png',
      } as any);
      fileStorage.saveGroupPicture.mockResolvedValue('new.png');
      commandBus.execute.mockResolvedValue(conversation);

      const result = await controller.updateGroupConversation(
        conversation.id,
        { title: 'New name' },
        pictureFile,
        'auth-user',
      );

      expect(fileStorage.saveGroupPicture).toHaveBeenCalledWith(pictureFile);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateGroupConversationCommand(
          conversation.id,
          'auth-user',
          'New name',
          'new.png',
        ),
      );
      expect(fileStorage.deleteGroupPicture).toHaveBeenCalledWith(
        '/uploads/group-pictures/old.png',
      );
      expect(chatWsGateway.serverBroadcast).toHaveBeenCalled();
      expect(result).toEqual({
        id: conversation.id,
        title: 'New name',
        picture: '/uploads/group-pictures/new.png',
      });
      expect(result).not.toHaveProperty('updatedBy');
    });

    it('should remove the picture when removePicture is true', async () => {
      const conversation = ConversationEntity.createGroup(
        'auth-user',
        'Team',
        [],
        null,
      );

      conversationRepository.getConversationById.mockResolvedValue({
        id: conversation.id,
        picture: '/uploads/group-pictures/old.png',
      } as any);
      commandBus.execute.mockResolvedValue(conversation);

      const result = await controller.updateGroupConversation(
        conversation.id,
        { removePicture: true },
        undefined,
        'auth-user',
      );

      expect(fileStorage.saveGroupPicture).not.toHaveBeenCalled();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateGroupConversationCommand(
          conversation.id,
          'auth-user',
          undefined,
          null,
        ),
      );
      expect(fileStorage.deleteGroupPicture).toHaveBeenCalledWith(
        '/uploads/group-pictures/old.png',
      );
      expect(result.picture).toBeNull();
    });

    it('should remove the existing picture when no new picture is sent', async () => {
      const conversation = ConversationEntity.createGroup(
        'auth-user',
        'New name',
        [],
        null,
      );

      conversationRepository.getConversationById.mockResolvedValue({
        id: conversation.id,
        picture: '/uploads/group-pictures/old.png',
      } as any);
      commandBus.execute.mockResolvedValue(conversation);

      const result = await controller.updateGroupConversation(
        conversation.id,
        { title: 'New name' },
        undefined,
        'auth-user',
      );

      expect(fileStorage.saveGroupPicture).not.toHaveBeenCalled();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateGroupConversationCommand(
          conversation.id,
          'auth-user',
          'New name',
          null,
        ),
      );
      expect(fileStorage.deleteGroupPicture).toHaveBeenCalledWith(
        '/uploads/group-pictures/old.png',
      );
      expect(result.picture).toBeNull();
    });

    it('should reject a request with nothing to update', async () => {
      await expect(
        controller.updateGroupConversation(
          'conversation-1',
          {},
          undefined,
          'auth-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete the uploaded picture when the update fails', async () => {
      fileStorage.saveGroupPicture.mockResolvedValue('new.png');
      commandBus.execute.mockRejectedValueOnce(new Error('not an admin'));

      await expect(
        controller.updateGroupConversation(
          'conversation-1',
          { title: 'New name' },
          pictureFile,
          'auth-user',
        ),
      ).rejects.toThrow('not an admin');

      expect(fileStorage.deleteGroupPicture).toHaveBeenCalledWith('new.png');
    });
  });
});
