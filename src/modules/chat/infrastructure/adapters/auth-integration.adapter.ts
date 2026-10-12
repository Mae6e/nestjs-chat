import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '@infrastructure/config/auth.config';
import {
  AuthIntegrationPort,
  ValidatedTokenPayload,
} from '@modules/chat/application/ports/auth-integration.port';

@Injectable()
export class AuthIntegrationAdapter implements AuthIntegrationPort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConf: ConfigType<typeof authConfig>,
  ) {}

  //   async signAccessToken(userId: string, role: string): Promise<string> {
  //   return await this.jwtService.signAsync(
  //     {
  //       sub: userId,
  //       role: role,
  //     },
  //     {
  //       privateKey: this.authConf.accessPrivateKey,
  //       expiresIn: '1d',
  //     },
  //   );
  // }

  async verifyToken(token: string): Promise<ValidatedTokenPayload> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      role?: string;
      exp: number;
    }>(token, {
      publicKey: this.authConf.accessPublicKey,
    });

    return { sub: payload.sub, role: payload.role, exp: payload.exp };
  }
}
