import { JwtService } from '@nestjs/jwt';
import { ChatIntegrationAuthAdapter } from './chat-integration-auth.adapter';

describe('ChatIntegrationAuthAdapter', () => {
  let jwtService: jest.Mocked<JwtService>;
  let adapter: ChatIntegrationAuthAdapter;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    adapter = new ChatIntegrationAuthAdapter(jwtService, {
      accessPublicKey: 'user-public-key',
      integrationPublicKey: 'integration-public-key',
      integrationTokenIssuer: 'trusted-issuer',
      integrationTokenAudience: 'nestjs-chat-integration',
    });
  });

  it('validates and maps an integration service token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'report-dashboard-service',
      tokenUse: 'service',
      scopes: ['chat.reports.read', 'chat.reports.read'],
      exp: 123,
    });

    const result = await adapter.verifyToken('service-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('service-token', {
      publicKey: 'integration-public-key',
      algorithms: ['RS256'],
      issuer: 'trusted-issuer',
      audience: 'nestjs-chat-integration',
      clockTolerance: 15,
    });
    expect(result).toEqual({
      sub: 'report-dashboard-service',
      tokenUse: 'service',
      scopes: ['chat.reports.read'],
      exp: 123,
    });
  });

  it('supports an OAuth-style space-delimited scope claim', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'report-dashboard-service',
      token_use: 'service',
      scope: 'chat.reports.read another.scope',
    });

    const result = await adapter.verifyToken('service-token');

    expect(result.scopes).toEqual(['chat.reports.read', 'another.scope']);
  });

  it('rejects a non-service token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenUse: 'user',
      scopes: ['chat.reports.read'],
    });

    await expect(adapter.verifyToken('user-token')).rejects.toThrow(
      'Integration token must be a service token.',
    );
  });
});
