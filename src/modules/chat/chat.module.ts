import { AuthIntegrationPort } from '@modules/chat/application/ports/auth-integration.port';
import { AuthIntegrationAdapter } from '@modules/chat/infrastructure/adapters/auth-integration.adapter';
import { ChatWsGuard } from '@modules/chat/presentation/ws/guards/chat-ws.guard';
import { ChatWsGateway } from '@modules/chat/presentation/ws/chat-ws.gateway';
import { Module } from '@nestjs/common';
import { ChatDatabaseModule } from '@modules/chat/infrastructure/database/chat-database.module';
import { UserIntegrationPort } from '@modules/chat/application/ports/user-integration.port';
import { UserIntegrationAdapter } from '@modules/chat/infrastructure/adapters/user-integration.adapter';
import { CqrsModule } from '@nestjs/cqrs';

import { CommandHandlers } from './application/commands';
import { QueryHandlers } from './application/queries';
import { EventHandlers } from './presentation/ws/events/handlers';
import { ChatHttpController } from './presentation/http/chat-http.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { authConfig } from '@infrastructure/config/auth.config';
import { ChatHttpGuard } from './presentation/http/guards/chat-http.guard';

@Module({
  imports: [
    CqrsModule,
    ChatDatabaseModule,
    ConfigModule,
    ConfigModule.forFeature(authConfig),
    JwtModule.register({
      signOptions: {
        algorithm: 'RS256',
        issuer: 'nestjs-chat',
        audience: 'nestjs-chat-client',
      },
      verifyOptions: {
        algorithms: ['RS256'],
        issuer: 'nestjs-chat',
        audience: 'nestjs-chat-client',
        clockTolerance: 15,
      },
    }),
  ],
  providers: [
    ChatWsGateway,
    ChatWsGuard,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ChatHttpGuard,
    { provide: AuthIntegrationPort, useClass: AuthIntegrationAdapter },
    {
      provide: UserIntegrationPort,
      useClass: UserIntegrationAdapter,
    },
  ],
  controllers: [ChatHttpController],
  exports: [],
})
export class ChatModule {}
