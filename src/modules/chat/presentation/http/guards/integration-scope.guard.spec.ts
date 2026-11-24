import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ChatIntegrationScope } from '@modules/chat/application/ports/chat-integration-auth.port';
import { IntegrationScopeGuard } from './integration-scope.guard';

describe('IntegrationScopeGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: IntegrationScopeGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new IntegrationScopeGuard(reflector);
  });

  function contextWithScopes(scopes: string[]): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ integrationClient: { scopes } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows a client that has every required scope', () => {
    reflector.getAllAndOverride.mockReturnValue([
      ChatIntegrationScope.REPORTS_READ,
    ]);

    expect(
      guard.canActivate(contextWithScopes([ChatIntegrationScope.REPORTS_READ])),
    ).toBe(true);
  });

  it('rejects a client without the required scope', () => {
    reflector.getAllAndOverride.mockReturnValue([
      ChatIntegrationScope.REPORTS_READ,
    ]);

    try {
      guard.canActivate(contextWithScopes([]));
      throw new Error('Expected guard to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'CHAT_INTEGRATION_SCOPE_REQUIRED',
      });
    }
  });

  it('allows an endpoint that does not require scopes', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextWithScopes([]))).toBe(true);
  });
});
