import { JwtService } from '@nestjs/jwt';
import { AuthIntegrationAdapter } from './auth-integration.adapter';

describe('AuthIntegrationAdapter', () => {
  let jwtService: jest.Mocked<JwtService>;
  let adapter: AuthIntegrationAdapter;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    adapter = new AuthIntegrationAdapter(jwtService, {
      accessPublicKey: 'user-public-key',
      integrationPublicKey: 'integration-public-key',
      integrationTokenIssuer: 'trusted-issuer',
      integrationTokenAudience: 'nestjs-chat-integration',
    });
  });

  it('verifies and maps an end-user access token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      role: 'USER',
      exp: 123456789,
    });

    const result = await adapter.verifyToken('valid-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      publicKey: 'user-public-key',
    });
    expect(result).toEqual({
      sub: 'user-1',
      role: 'USER',
      exp: 123456789,
    });
  });
});
