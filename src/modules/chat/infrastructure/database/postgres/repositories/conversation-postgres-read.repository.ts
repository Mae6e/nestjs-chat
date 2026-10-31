import { MessageReadDto } from '@modules/chat/application/dtos/message-read.dto';
import {
  ConversationReadDto,
  GroupConversationListItemReadDto,
} from '@modules/chat/application/dtos/conversation-read.dto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { Conversation } from '@modules/chat/infrastructure/database/postgres/entities/conversation.entity';
import { GetUserConversationIdsOptions } from '@modules/chat/application/ports/options/get-user-conversation-ids.options';
import { GetUserConversationListOptions } from '@modules/chat/application/ports/options/get-user-conversation-list.options';
import { ConversationMember } from '@modules/chat/infrastructure/database/postgres/entities/conversation-member.entity';
import { DeletedMessage } from '@modules/chat/infrastructure/database/postgres/entities/deleted-message.entity';
import { UserBlock } from '@modules/chat/infrastructure/database/postgres/entities/user-block.entity';
import { ConversationMemberReadDto } from '@modules/chat/application/dtos/conversation-read.dto';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';

import {
  PaginatedResult,
  PaginationOptions,
} from '@common/pagination/pagination.interface';
import { PaginationHelper } from '@common/pagination/pagination.helper';

@Injectable()
export class ConversationPostgresReadRepository implements ConversationReadRepositoryPort {
  constructor(
    @InjectRepository(Conversation, DatabaseType.POSTGRES)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message, DatabaseType.POSTGRES)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ConversationMember, DatabaseType.POSTGRES)
    private readonly conversationMemberRepository: Repository<ConversationMember>,
    @InjectRepository(UserBlock, DatabaseType.POSTGRES)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectDataSource(DatabaseType.POSTGRES)
    private readonly dataSource: DataSource,
  ) {}

  async conversationExists(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const res = await this.conversationRepository
      .createQueryBuilder('c')
      .innerJoin(
        'c.conversationMembers',
        'cm',
        'cm.user_id = :userId AND cm.status = :active',
        { userId, active: ConversationMemberStatus.ACTIVE },
      )
      .where('c.type = :type', { type: 'DIRECT' })
      .andWhereExists(
        this.conversationMemberRepository
          .createQueryBuilder('target_cm')
          .where('target_cm.conversation_id = c.id')
          .andWhere('target_cm.user_id = :targetUserId', { targetUserId })
          .andWhere('target_cm.status = :active', {
            active: ConversationMemberStatus.ACTIVE,
          }),
      )
      .getExists();

    return res;
  }

  async getUserConversationList(
    userId: string,
    options: GetUserConversationListOptions,
  ): Promise<PaginatedResult<ConversationReadDto>> {
    const query = this.conversationRepository
      .createQueryBuilder('c')
      .innerJoinAndSelect(
        'c.conversationMembers',
        'cm',
        'cm.user_id = :userId AND cm.status = :active',
        { userId, active: ConversationMemberStatus.ACTIVE },
      )
      .leftJoinAndSelect('cm.lastSeenMessage', 'lastSeenMessage');

    if (options.withLastMessage) {
      query
        .leftJoinAndSelect('cm.lastMessage', 'lastMessage')
        .leftJoinAndSelect('lastMessage.sender', 'lastMessageSender');
    }

    const filterUserIds = options.filterUserIds ?? [];
    const titleSearch = options.titleSearch?.trim();
    if (filterUserIds.length > 0 || titleSearch) {
      const conditions: string[] = [];
      const parameters: Record<string, unknown> = {};

      if (filterUserIds.length > 0) {
        // Match conversations containing any of the selected users.
        conditions.push(
          'EXISTS (SELECT 1 FROM chat.conversation_members cm_filter WHERE cm_filter.user_id IN (:...filterUserIds) AND cm_filter.conversation_id = c.id)',
        );
        parameters.filterUserIds = filterUserIds;
      }

      if (titleSearch) {
        // The conversation list `filter` also searches group titles.
        conditions.push('c.title ILIKE :titleSearch');
        parameters.titleSearch = `%${titleSearch}%`;
      }

      query.andWhere(`(${conditions.join(' OR ')})`, parameters);
    }

    if (options.type != null) {
      query.andWhere('c.type = :type', { type: options.type });
    }

    if (options.pagination) {
      query.offset(options.pagination.offset).limit(options.pagination.limit);
    }

    if (options.withLastMessage) {
      query.orderBy('lastMessage.created_at', 'DESC');
    } else {
      query.orderBy('c.created_at', 'DESC');
    }

    const [conversations, count] = await query.getManyAndCount();

    if (conversations.length === 0) {
      return PaginationHelper.createResult([], count, options.pagination);
    }

    const conversationIds = conversations.map((c) => c.id);

    const notSeenCountsMap = await this.getNotSeenCounts(
      userId,
      conversationIds,
    );

    // Map to DTOs
    const dtos: ConversationReadDto[] = conversations.map((conv) => {
      const currentMember = conv.conversationMembers.find(
        (cm) => cm.user_id === userId,
      );

      return {
        id: conv.id,
        type: conv.type,
        identifier: conv.identifier,
        title: conv.title,
        picture: conv.picture,
        updatedBy: conv.updated_by ?? null,
        createdAt: conv.created_at.toISOString(),
        updatedAt: conv.updated_at.toISOString(),
        notSeenCount: notSeenCountsMap.get(conv.id) || 0,
        lastMessage: currentMember?.lastMessage
          ? {
              id: currentMember.lastMessage.id,
              text: currentMember.lastMessage.text,
              type: currentMember.lastMessage.type,
              senderId: currentMember.lastMessage.sender
                ? currentMember.lastMessage.sender.user_id
                : currentMember.lastMessage.sender_id,
              createdAt: currentMember.lastMessage.created_at.toISOString(),
            }
          : null,
        members: conv.conversationMembers
          .filter((cm) => cm.status === ConversationMemberStatus.ACTIVE)
          .map((cm) => this.mapMemberToDto(cm)),
      };
    });

    // Populate all active members (direct has one other, group may have many)
    const allMembers = await this.conversationMemberRepository
      .createQueryBuilder('cm')
      .where('cm.conversation_id IN (:...conversationIds)', { conversationIds })
      .andWhere('cm.status = :active', {
        active: ConversationMemberStatus.ACTIVE,
      })
      .getMany();

    dtos.forEach((dto) => {
      const existingIds = new Set(dto.members.map((m) => m.id));
      const membersForThisConv = allMembers.filter(
        (m) =>
          m.conversation_id === dto.id &&
          m.user_id !== userId &&
          !existingIds.has(m.id),
      );
      membersForThisConv.forEach((m) => {
        dto.members.push(this.mapMemberToDto(m));
      });
    });

    return PaginationHelper.createResult(dtos, count, options.pagination);
  }

  async getUserGroupConversationList(
    userId: string,
    pagination: PaginationOptions,
    search?: string,
    joinedOnly?: boolean,
  ): Promise<PaginatedResult<GroupConversationListItemReadDto>> {
    const query = this.conversationRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect(
        'c.conversationMembers',
        'my_membership',
        'my_membership.user_id = :userId',
        { userId },
      )
      .where('c.type = :type', { type: ConversationType.GROUP })
      .orderBy('c.updated_at', 'DESC')
      .offset(pagination.offset)
      .limit(pagination.limit);

    const searchTerm = search?.trim();
    if (searchTerm) {
      query.andWhere('c.title ILIKE :search', {
        search: `%${searchTerm}%`,
      });
    }

    if (joinedOnly) {
      query.andWhere('my_membership.status IN (:...memberStatuses)', {
        memberStatuses: [
          ConversationMemberStatus.ACTIVE,
          ConversationMemberStatus.PENDING,
        ],
      });
    }

    const [conversations, count] = await query.getManyAndCount();

    if (conversations.length === 0) {
      return PaginationHelper.createResult([], count, pagination);
    }

    const conversationIds = conversations.map((c) => c.id);
    const notSeenCountsMap = await this.getNotSeenCounts(
      userId,
      conversationIds,
    );

    const memberCounts = await this.conversationMemberRepository
      .createQueryBuilder('cm_count')
      .select('cm_count.conversation_id', 'conversationId')
      .addSelect('COUNT(*)', 'memberCount')
      .where('cm_count.conversation_id IN (:...conversationIds)', {
        conversationIds,
      })
      .andWhere('cm_count.status = :active', {
        active: ConversationMemberStatus.ACTIVE,
      })
      .groupBy('cm_count.conversation_id')
      .getRawMany();

    const memberCountsMap = new Map<string, number>();
    memberCounts.forEach((row) => {
      memberCountsMap.set(
        row.conversationId,
        parseInt(row.memberCount, 10) || 0,
      );
    });

    const dtos: GroupConversationListItemReadDto[] = conversations.map(
      (conv) => {
        const myMembership = conv.conversationMembers?.find(
          (cm) => cm.user_id === userId,
        );

        return {
          id: conv.id,
          title: conv.title,
          description: conv.description,
          picture: conv.picture,
          createdAt: conv.created_at.toISOString(),
          updatedAt: conv.updated_at.toISOString(),
          memberCount: memberCountsMap.get(conv.id) ?? 0,
          createdByMe: conv.created_by === userId,
          notSeenCount: notSeenCountsMap.get(conv.id) || 0,
          status: myMembership?.status ?? null,
          ...(myMembership ? { role: myMembership.role } : {}),
        };
      },
    );

    return PaginationHelper.createResult(dtos, count, pagination);
  }

  async getUserConversationIds(
    userId: string,
    options: GetUserConversationIdsOptions,
  ): Promise<string[]> {
    const query = this.conversationRepository
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .innerJoin('c.conversationMembers', 'cm', 'cm.user_id = :userId', {
        userId,
      });

    if (options.type != null) {
      query.andWhere('c.type = :type', { type: options.type });
    }

    const res = await query.getMany().then((rows) => rows.map((c) => c.id));

    return res;
  }

  async getUserConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationReadDto | null> {
    const res = await this.conversationRepository
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.conversationMembers', 'cm')
      .leftJoinAndSelect('cm.lastSeenMessage', 'lsm')
      .where('c.id = :conversationId', { conversationId })
      .andWhereExists(
        this.conversationMemberRepository
          .createQueryBuilder('sub_cm')
          .where('sub_cm.user_id = :userId', { userId })
          .andWhere('sub_cm.conversation_id = c.id')
          .andWhere('sub_cm.status = :active', {
            active: ConversationMemberStatus.ACTIVE,
          }),
      )
      .getOne();

    if (!res) {
      return null;
    }

    const dto: ConversationReadDto = {
      id: res.id,
      type: res.type,
      identifier: res.identifier,
      title: res.title,
      picture: res.picture,
      updatedBy: res.updated_by ?? null,
      createdAt: res.created_at.toISOString(),
      updatedAt: res.updated_at.toISOString(),
      notSeenCount: 0,
      lastMessage: null,
      members: res.conversationMembers
        .filter((cm) => cm.status === ConversationMemberStatus.ACTIVE)
        .map((cm) => this.mapMemberToDto(cm)),
    };

    return dto;
  }

  async getGroupMembers(
    conversationId: string,
    status?: ConversationMemberStatus,
  ): Promise<ConversationMemberReadDto[]> {
    const query = this.conversationMemberRepository
      .createQueryBuilder('cm')
      .where('cm.conversation_id = :conversationId', { conversationId });

    if (status) {
      query.andWhere('cm.status = :status', { status });
    }

    query.orderBy('cm.created_at', 'ASC');
    const members = await query.getMany();
    return members.map((m) => this.mapMemberToDto(m));
  }

  async getGroupJoinRequests(
    conversationId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<ConversationMemberReadDto>> {
    const [members, count] = await this.conversationMemberRepository
      .createQueryBuilder('cm')
      .where('cm.conversation_id = :conversationId', { conversationId })
      .andWhere('cm.status = :status', {
        status: ConversationMemberStatus.PENDING,
      })
      .orderBy('cm.created_at', 'ASC')
      .offset(pagination.offset)
      .limit(pagination.limit)
      .getManyAndCount();

    return PaginationHelper.createResult(
      members.map((m) => this.mapMemberToDto(m)),
      count,
      pagination,
    );
  }

  private async getNotSeenCounts(
    userId: string,
    conversationIds: string[],
  ): Promise<Map<string, number>> {
    const notSeenCountsQuery = await this.conversationMemberRepository
      .createQueryBuilder('cm')
      .select('cm.conversation_id', 'conversationId')
      .where('cm.user_id = :userId', { userId })
      .andWhere('cm.conversation_id IN (:...conversationIds)', {
        conversationIds,
      })
      .addSelect(
        (qb: SelectQueryBuilder<any>) =>
          qb
            .select('COUNT(m.id) - COUNT(dm.message_id)')
            .from(Message, 'm')
            .leftJoin(
              DeletedMessage,
              'dm',
              'm.id = dm.message_id AND dm.user_id = :userId',
              { userId },
            )
            .where('m.conversation_id = cm.conversation_id')
            .andWhere(
              '(cm.last_seen_message_id IS NULL OR m.id > cm.last_seen_message_id)',
            ),
        'notSeenCount',
      )
      .getRawMany();

    const notSeenCountsMap = new Map<string, number>();
    notSeenCountsQuery.forEach((row) => {
      notSeenCountsMap.set(
        row.conversationId,
        parseInt(row.notSeenCount, 10) || 0,
      );
    });

    return notSeenCountsMap;
  }

  private mapMemberToDto(cm: ConversationMember): ConversationMemberReadDto {
    return {
      id: cm.id,
      userId: cm.user_id,
      role: cm.role,
      status: cm.status,
      lastSeenMessageId: cm.last_seen_message_id,
      lastSeenMessage: cm.lastSeenMessage
        ? {
            createdAt: cm.lastSeenMessage.created_at.toISOString(),
          }
        : null,
      lastMessageId: cm.last_message_id,
      updatedBy: cm.updated_by ?? null,
    };
  }

  async getUserConversationMessageList(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<MessageReadDto>> {
    const [messages, count] = await this.dataSource.transaction(
      async (entityManager) => {
        const queryRes = await entityManager
          .getRepository(Message)
          .createQueryBuilder('m')
          .innerJoinAndSelect('m.sender', 'cm')
          .where('m.conversation_id = :conversationId', { conversationId })
          .andWhere(() => {
            const sq = entityManager
              .getRepository(DeletedMessage)
              .createQueryBuilder('dm')
              .where('dm.user_id = :userId')
              .andWhere('dm.message_id = m.id')
              .getQuery();

            return `NOT EXISTS (${sq})`;
          })
          .setParameter('userId', userId)
          .orderBy('m.created_at', 'DESC')
          .offset(pagination.offset)
          .limit(pagination.limit)
          .getManyAndCount();

        return queryRes;
      },
    );

    const dtos: MessageReadDto[] = messages.map((m) => ({
      id: m.id,
      text: m.text,
      type: m.type,
      senderId: m.sender ? m.sender.user_id : m.sender_id,
      createdAt: m.created_at.toISOString(),
    }));

    return PaginationHelper.createResult(dtos, count, pagination);
  }

  async getBlockStatus(blockerId: string, blockedId: string): Promise<boolean> {
    const res = await this.userBlockRepository
      .createQueryBuilder('ub')
      .where('blocker_id = :blockerId', { blockerId })
      .andWhere('blocked_id = :blockedId', { blockedId })
      .getExists();

    return res;
  }

  async getBlockedUserIds(
    blockerId: string,
    blockedIds?: string[],
  ): Promise<string[]> {
    const query = this.userBlockRepository
      .createQueryBuilder('ub')
      .select('blocked_id', 'blockedId')
      .where('blocker_id = :userId', { userId: blockerId }); // Fixed variable interpolation

    if (blockedIds?.length) {
      query.andWhere('blocked_id IN (:...blockedIds)', { blockedIds }); // Fixed s
    }

    const res = await query.getRawMany<{ blockedId: string }>();

    return res.map((r) => r.blockedId);
  }
}
