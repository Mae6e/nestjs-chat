import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '@infrastructure/config/auth.config';
import {
  ChatIntegrationAuthPort,
  ValidatedIntegrationTokenPayload,
} from '@modules/chat/application/ports/chat-integration-auth.port';

interface IntegrationJwtPayload {
  sub?: unknown;
  tokenUse?: unknown;
  token_use?: unknown;
  scopes?: unknown;
  scope?: unknown;
  exp?: number;
}

@Injectable()
export class ChatIntegrationAuthAdapter implements ChatIntegrationAuthPort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConf: ConfigType<typeof authConfig>,
  ) {}

  async verifyToken(token: string): Promise<ValidatedIntegrationTokenPayload> {
    const payload = await this.jwtService.verifyAsync<IntegrationJwtPayload>(
      token,
      {
        publicKey: this.authConf.integrationPublicKey,
        algorithms: ['RS256'],
        issuer: this.authConf.integrationTokenIssuer,
        audience: this.authConf.integrationTokenAudience,
        clockTolerance: 15,
      },
    );

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Integration token subject is missing.');
    }

    const tokenUse = payload.tokenUse ?? payload.token_use;
    if (tokenUse !== 'service') {
      throw new Error('Integration token must be a service token.');
    }

    const scopes = this.normalizeScopes(payload.scopes, payload.scope);

    return {
      sub: payload.sub,
      tokenUse: 'service',
      scopes,
      exp: payload.exp,
    };
  }

  private normalizeScopes(scopes: unknown, scope: unknown): string[] {
    if (Array.isArray(scopes)) {
      return Array.from(
        new Set(
          scopes.filter((value): value is string => typeof value === 'string'),
        ),
      );
    }

    if (typeof scope === 'string') {
      return Array.from(new Set(scope.split(/\s+/).filter(Boolean)));
    }

    return [];
  }
}
