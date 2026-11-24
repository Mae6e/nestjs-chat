import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { Conversation } from '@modules/chat/infrastructure/database/postgres/entities/conversation.entity';
import { ConversationEntity } from '@modules/chat/domain/models/conversation.model';
import { ConversationMember } from '@modules/chat/infrastructure/database/postgres/entities/conversation-member.entity';
import { ConversationMemberEntity } from '@modules/chat/domain/models/conversation-member.model';
import { MessageEntity } from '@modules/chat/domain/models/message.model';
import { DeletedMessage } from '@modules/chat/infrastructure/database/postgres/entities/deleted-message.entity';
import { UserBlock } from '@modules/chat/infrastructure/database/postgres/entities/user-block.entity';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';

const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string } | undefined;

  return driverError?.code === POSTGRES_UNIQUE_VIOLATION;
}

@Injectable()
export class ConversationPostgresRepository implements ConversationRepositoryPort {
  constructor(
    @InjectDataSource(DatabaseType.POSTGRES)
    private readonly dataSource: DataSource,
  ) {}

  async getConversationById(id: string): Promise<ConversationEntity | null> {
    const conversation = await this.dataSource
      .getRepository(Conversation)
      .findOne({
        where: { id },
        relations: { conversationMembers: true },
      });

    if (!conversation) {
      return null;
    }

    return Conversation.toDomain(conversation);
  }

  async saveConversation(
    conversationEntity: ConversationEntity,
  ): Promise<ConversationEntity> {
    try {
      return await this.persistConversation(conversationEntity);
    } catch (error) {
      // Two concurrent `conversation.create` calls can both pass the "already
      // exists" check. The deterministic `direct_key` makes the loser hit the
      // unique index, so return the conversation that won instead of failing
      // (or creating a duplicate).
      if (isUniqueViolation(error) && conversationEntity.directKey) {
        const existing = await this.findDirectConversationByKey(
          conversationEntity.directKey,
        );
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  private async persistConversation(
    conversationEntity: ConversationEntity,
  ): Promise<ConversationEntity> {
    const res = await this.dataSource.transaction(async (entityManager) => {
      // Save Conversation
      const conversationToSave = Conversation.fromDomain(conversationEntity);
      const conversation = await entityManager.save(conversationToSave);

      // Save Conversation Members
      if (conversationToSave.conversationMembers?.length) {
        await entityManager.save(conversationToSave.conversationMembers);
      }

      // Save Messages
      if (conversationToSave.messages?.length) {
        await entityManager.save(conversationToSave.messages);
      }

      // Reload with relation
      return entityManager.findOne(Conversation, {
        where: { id: conversation.id },
        relations: { conversationMembers: true },
      });
    });

    return Conversation.toDomain(res);
  }

  private async findDirectConversationByKey(
    directKey: string,
  ): Promise<ConversationEntity | null> {
    const conversation = await this.dataSource
      .getRepository(Conversation)
      .findOne({
        where: { direct_key: directKey },
        relations: { conversationMembers: true },
      });

    return conversation ? Conversation.toDomain(conversation) : null;
  }

  async saveMessage(messageEntity: MessageEntity): Promise<MessageEntity> {
    const res = await this.dataSource.transaction(async (entityManager) => {
      const messageToSave = Message.fromDomain(messageEntity);
      const message = await entityManager.save(messageToSave);

      // Save deleted message relations
      if (messageEntity.deletedForUserIds?.length) {
        const deletedMessages = messageEntity.deletedForUserIds.map(
          (userId) => {
            const dm = new DeletedMessage();
            dm.user_id = userId;
            dm.message_id = message.id;
            return dm;
          },
        );
        await entityManager.save(DeletedMessage, deletedMessages);
      }

      // Update the last_message_id for all conversation members who have NOT deleted this message
      const conversationMembersToUpdate = await entityManager
        .getRepository(ConversationMember)
        .createQueryBuilder('cm')
        .where('cm.conversation_id = :conversationId', {
          conversationId: message.conversation_id,
        })
        .getMany();

      const memberUpdates = conversationMembersToUpdate.map((cm) => {
        // If the user hasn't deleted the message, update their last message
        if (!messageEntity.deletedForUserIds.includes(cm.user_id)) {
          cm.last_message_id = message.id;
        }
        // If the user is the sender, also update their last_seen_message
        if (cm.id === messageEntity.senderId) {
          cm.last_seen_message_id = message.id;
        }
        return cm;
      });

      await entityManager.save(ConversationMember, memberUpdates);

      return message;
    });

    const entity = Message.toDomain(res);
    // Restore the deletedForUserIds to the returned entity since we don't map it back natively in fromDomain
    messageEntity.deletedForUserIds.forEach((id) => entity.deleteForUser(id));

    return entity;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const res = await this.dataSource.transaction(async (entityManager) => {
      const [, deleteConversation] = await Promise.all([
        entityManager
          .createQueryBuilder()
          .softDelete()
          .from(ConversationMember)
          .where('conversation_id = :conversationId', { conversationId: id })
          .execute(),
        entityManager
          .createQueryBuilder()
          .softDelete()
          .from(Conversation)
          .where('id = :id', { id: id })
          .execute(),
      ]);

      return deleteConversation.affected === 1;
    });

    return res;
  }

  async getMembership(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity | null> {
    const member = await this.dataSource
      .getRepository(ConversationMember)
      .findOne({
        where: { conversation_id: conversationId, user_id: userId },
        withDeleted: true,
      });

    if (!member) {
      return null;
    }

    return ConversationMember.toDomain(member);
  }

  async countMembers(
    conversationId: string,
    status: ConversationMemberStatus = ConversationMemberStatus.ACTIVE,
  ): Promise<number> {
    return this.dataSource.getRepository(ConversationMember).count({
      where: { conversation_id: conversationId, status },
    });
  }

  async hasActiveGroupMembership(
    userId: string,
    exceptConversationId?: string,
  ): Promise<boolean> {
    const query = this.dataSource
      .getRepository(ConversationMember)
      .createQueryBuilder('cm')
      .innerJoin('cm.conversation', 'c')
      .where('cm.user_id = :userId', { userId })
      .andWhere('cm.status = :status', {
        status: ConversationMemberStatus.ACTIVE,
      })
      .andWhere('c.type = :type', { type: ConversationType.GROUP });

    if (exceptConversationId) {
      query.andWhere('cm.conversation_id != :exceptConversationId', {
        exceptConversationId,
      });
    }

    return query.getExists();
  }

  async deletePendingMembershipsForUser(
    userId: string,
    exceptConversationId?: string,
    deletedBy: string | null = null,
  ): Promise<number> {
    return this.dataSource.transaction(async (entityManager) => {
      const memberRepository = entityManager.getRepository(ConversationMember);

      const query = memberRepository
        .createQueryBuilder('cm')
        .select('cm.id', 'id')
        .where('cm.user_id = :userId', { userId })
        .andWhere('cm.status = :status', {
          status: ConversationMemberStatus.PENDING,
        });

      if (exceptConversationId) {
        query.andWhere('cm.conversation_id != :exceptConversationId', {
          exceptConversationId,
        });
      }

      const pending = await query.getRawMany<{ id: string }>();
      if (pending.length === 0) {
        return 0;
      }

      const ids = pending.map((row) => row.id);

      const result = await memberRepository
        .createQueryBuilder()
        .softDelete()
        .from(ConversationMember)
        .whereInIds(ids)
        .execute();

      if (deletedBy !== null) {
        await memberRepository
          .createQueryBuilder()
          .update(ConversationMember)
          .set({ deleted_by: deletedBy })
          .whereInIds(ids)
          .execute();
      }

      return result.affected ?? 0;
    });
  }

  async saveMember(
    memberEntity: ConversationMemberEntity,
  ): Promise<ConversationMemberEntity> {
    const member = ConversationMember.fromDomain(memberEntity);
    // `undefined` is ignored by TypeORM save, so make the restored/cleared
    // soft-delete state explicit.
    member.deleted_at = memberEntity.deletedAt ?? null;

    const saved = await this.dataSource
      .getRepository(ConversationMember)
      .save(member);

    return ConversationMember.toDomain(saved);
  }

  async softDeleteMember(
    conversationId: string,
    userId: string,
    deletedBy: string | null = null,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (entityManager) => {
      const memberRepository = entityManager.getRepository(ConversationMember);

      const res = await memberRepository
        .createQueryBuilder()
        .softDelete()
        .from(ConversationMember)
        .where('conversation_id = :conversationId', { conversationId })
        .andWhere('user_id = :userId', { userId })
        .execute();

      if (res.affected === 0) {
        return false;
      }

      await memberRepository.update(
        { conversation_id: conversationId, user_id: userId },
        { deleted_by: deletedBy },
      );

      return true;
    });
  }

  async block(blockerId: string, blockedId: string): Promise<boolean> {
    return this.dataSource.transaction(async (entityManager) => {
      const userBlockRepository = entityManager.getRepository(UserBlock);

      // Unblocking soft-deletes the row, but the composite primary key
      // (blocker_id, blocked_id) still holds it. Look at deleted rows too so a
      // re-block revives the existing row instead of inserting a duplicate.
      const existingBlock = await userBlockRepository
        .createQueryBuilder('ub')
        .withDeleted()
        .where('blocker_id = :blockerId', { blockerId })
        .andWhere('blocked_id = :blockedId', { blockedId })
        .getOne();

      if (existingBlock && existingBlock.deleted_at === null) {
        return false;
      }

      if (existingBlock) {
        await userBlockRepository.restore({
          blocker_id: blockerId,
          blocked_id: blockedId,
        });
        return true;
      }

      const userBlock = new UserBlock();
      userBlock.blocker_id = blockerId;
      userBlock.blocked_id = blockedId;

      try {
        await userBlockRepository.insert(userBlock);
      } catch (error) {
        // Two concurrent block requests can both pass the existence check;
        // the loser hits the primary key constraint and is already blocked.
        if (isUniqueViolation(error)) {
          return false;
        }
        throw error;
      }

      return true;
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const res = await this.dataSource
      .getRepository(UserBlock)
      .createQueryBuilder()
      .where('blocker_id = :blockerId', { blockerId })
      .andWhere('blocked_id = :blockedId', { blockedId })
      .softDelete()
      .execute();

    return res.affected !== 0;
  }

  async getBlockStatus(blockerId: string, blockedId: string): Promise<boolean> {
    return this.dataSource
      .getRepository(UserBlock)
      .createQueryBuilder('ub')
      .where('blocker_id = :blockerId', { blockerId })
      .andWhere('blocked_id = :blockedId', { blockedId })
      .getExists();
  }

  async getBlockedUserIds(
    blockerId: string,
    blockedIds?: string[],
  ): Promise<string[]> {
    const query = this.dataSource
      .getRepository(UserBlock)
      .createQueryBuilder('ub')
      .select('blocked_id', 'blockedId')
      .where('blocker_id = :userId', { userId: blockerId }); // Fix from :userId to match param, was previously bugged? Ah, in target it was userId

    if (blockedIds?.length) {
      query.andWhere('blocked_id IN (:...blockedIds)', { blockedIds }); // Fixed missing 's'
    }

    const res = await query.getRawMany<any>();

    return res.map((r) => r.blockedId);
  }
}
