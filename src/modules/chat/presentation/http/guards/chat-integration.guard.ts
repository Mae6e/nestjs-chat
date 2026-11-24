import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatIntegrationAuthPort } from '@modules/chat/application/ports/chat-integration-auth.port';
import { IntegrationAuthenticatedRequest } from '@modules/chat/presentation/http/interfaces/integration-authenticated-request.interface';

@Injectable()
export class ChatIntegrationGuard implements CanActivate {
  private readonly logger = new Logger(ChatIntegrationGuard.name);

  constructor(private readonly integrationAuth: ChatIntegrationAuthPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<IntegrationAuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException({
        message: 'No integration access token was provided.',
        code: 'CHAT_INTEGRATION_TOKEN_REQUIRED',
      });
    }

    try {
      request.integrationClient = await this.integrationAuth.verifyToken(token);
      return true;
    } catch (error) {
      this.logger.warn(
        `Integration token verification failed: ${(error as Error).message}`,
      );
      throw new UnauthorizedException({
        message: 'Invalid integration access token.',
        code: 'CHAT_INTEGRATION_TOKEN_INVALID',
      });
    }
  }

  private extractBearerToken(authorization?: string): string | null {
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
