import { Request } from 'express';
import { ValidatedIntegrationTokenPayload } from '@modules/chat/application/ports/chat-integration-auth.port';

export interface IntegrationAuthenticatedRequest extends Request {
  integrationClient: ValidatedIntegrationTokenPayload;
}
