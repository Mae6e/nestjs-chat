import { ChatModule } from '@modules/chat/chat.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config';
import { httpConfig } from '@infrastructure/http/http.config';
import { LoggerModule } from '@infrastructure/logger/logger.module';
import { wsConfig } from '@infrastructure/websocket/ws.config';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { DatabaseType } from '@infrastructure/database/database-type.enum';
import { platformApiConfig } from '@infrastructure/platform-api/platform-api.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, httpConfig, wsConfig, platformApiConfig],
      cache: true,
    }),
    DatabaseModule.register(DatabaseType.POSTGRES),
    LoggerModule.forRoot({ isGlobal: true }),
    RedisModule,
    ChatModule,
  ],
})
export class AppModule {}
