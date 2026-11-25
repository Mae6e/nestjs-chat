import { SetMetadata } from '@nestjs/common';
import { ChatIntegrationScope } from '@modules/chat/application/ports/chat-integration-auth.port';

export const INTEGRATION_SCOPES_KEY = 'chat.integration.required-scopes';

export const RequireIntegrationScopes = (...scopes: ChatIntegrationScope[]) =>
  SetMetadata(INTEGRATION_SCOPES_KEY, scopes);
