import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ChatIntegrationScope } from '@modules/chat/application/ports/chat-integration-auth.port';
import { INTEGRATION_SCOPES_KEY } from '@modules/chat/presentation/http/decorators/require-integration-scopes.decorator';
import { IntegrationAuthenticatedRequest } from '@modules/chat/presentation/http/interfaces/integration-authenticated-request.interface';

@Injectable()
export class IntegrationScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes =
      this.reflector.getAllAndOverride<ChatIntegrationScope[]>(
        INTEGRATION_SCOPES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredScopes.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<IntegrationAuthenticatedRequest>();
    const grantedScopes = new Set(request.integrationClient?.scopes ?? []);
    const missingScopes = requiredScopes.filter(
      (scope) => !grantedScopes.has(scope),
    );

    if (missingScopes.length > 0) {
      throw new ForbiddenException({
        message: 'The integration token does not have the required scope.',
        code: 'CHAT_INTEGRATION_SCOPE_REQUIRED',
      });
    }

    return true;
  }
}
