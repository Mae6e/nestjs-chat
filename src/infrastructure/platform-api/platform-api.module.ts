import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformApiClient } from './platform-api.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: cfg.getOrThrow<string>('PLATFORM_API_URL'),
        headers: {
          'x-api-key': cfg.getOrThrow('PLATFORM_API_KEY'),
        },
        timeout: 3000,
      }),
    }),
  ],
  providers: [PlatformApiClient],
  exports: [PlatformApiClient],
})
export class PlatformApiModule {}
