import { ConversationRepositoryPort } from '@modules/chat/application/ports/conversation-repository.port';
import { Module } from '@nestjs/common';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationReadRepositoryPort } from '@modules/chat/application/ports/conversation-read-repository.port';
import { ReportRepositoryPort } from '@modules/chat/application/ports/report-repository.port';
import { ConversationPostgresRepository } from '@modules/chat/infrastructure/database/postgres/repositories/conversation-postgres.repository';
import { ConversationPostgresReadRepository } from '@modules/chat/infrastructure/database/postgres/repositories/conversation-postgres-read.repository';
import { ReportPostgresRepository } from '@modules/chat/infrastructure/database/postgres/repositories/report-postgres.repository';
import { Message } from '@modules/chat/infrastructure/database/postgres/entities/message.entity';
import { Conversation } from '@modules/chat/infrastructure/database/postgres/entities/conversation.entity';
import { ConversationMember } from '@modules/chat/infrastructure/database/postgres/entities/conversation-member.entity';
import { DeletedMessage } from '@modules/chat/infrastructure/database/postgres/entities/deleted-message.entity';
import { UserBlock } from '@modules/chat/infrastructure/database/postgres/entities/user-block.entity';
import { Report } from '@modules/chat/infrastructure/database/postgres/entities/report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        Conversation,
        Message,
        ConversationMember,
        DeletedMessage,
        UserBlock,
        Report,
      ],
      DatabaseType.POSTGRES,
    ),
  ],
  providers: [
    {
      provide: ConversationRepositoryPort,
      useClass: ConversationPostgresRepository,
    },
    {
      provide: ConversationReadRepositoryPort,
      useClass: ConversationPostgresReadRepository,
    },
    {
      provide: ReportRepositoryPort,
      useClass: ReportPostgresRepository,
    },
  ],
  exports: [
    ConversationRepositoryPort,
    ConversationReadRepositoryPort,
    ReportRepositoryPort,
  ],
})
export class ChatDatabaseModule {}
