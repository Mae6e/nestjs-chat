import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ChatIntegrationAuthPort } from '@modules/chat/application/ports/chat-integration-auth.port';
import { ChatIntegrationGuard } from './chat-integration.guard';

describe('ChatIntegrationGuard', () => {
  let integrationAuth: jest.Mocked<ChatIntegrationAuthPort>;
  let guard: ChatIntegrationGuard;

  beforeEach(() => {
    integrationAuth = {
      verifyToken: jest.fn(),
    } as jest.Mocked<ChatIntegrationAuthPort>;
    guard = new ChatIntegrationGuard(integrationAuth);
  });

  function createContext(authorization?: string) {
    const request = { headers: { authorization } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('authenticates a service token and stores the integration client', async () => {
    const payload = {
      sub: 'report-dashboard-service',
      tokenUse: 'service' as const,
      scopes: ['chat.reports.read'],
      exp: 123,
    };
    integrationAuth.verifyToken.mockResolvedValue(payload);
    const { context, request } = createContext('Bearer service-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(integrationAuth.verifyToken).toHaveBeenCalledWith('service-token');
    expect(request.integrationClient).toEqual(payload);
  });

  it('rejects a request without a bearer token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CHAT_INTEGRATION_TOKEN_REQUIRED',
      }),
    });
  });

  it('rejects a token that fails verification', async () => {
    integrationAuth.verifyToken.mockRejectedValue(new Error('invalid token'));
    const { context } = createContext('Bearer invalid-token');

    try {
      await guard.canActivate(context);
      throw new Error('Expected guard to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        code: 'CHAT_INTEGRATION_TOKEN_INVALID',
      });
    }
  });
});
