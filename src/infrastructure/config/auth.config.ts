import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import * as fs from 'fs';

const authConfigSchema = z.object({
  accessPublicKey: z.string().min(1),
  integrationPublicKey: z.string().min(1),
  integrationTokenIssuer: z.string().min(1),
  integrationTokenAudience: z.string().min(1),
  //accessPrivateKey: z.string().min(1),
});

export const authConfig = registerAs('auth', () => {
  try {
    const accessPublicKeyPath = process.env
      .AUTH_ACCESS_PUBLIC_KEY_PATH as string;
    const integrationPublicKeyPath =
      process.env.AUTH_INTEGRATION_PUBLIC_KEY_PATH ?? accessPublicKeyPath;

    return authConfigSchema.parse({
      accessPublicKey: fs.readFileSync(accessPublicKeyPath, 'utf8'),
      integrationPublicKey: fs.readFileSync(integrationPublicKeyPath, 'utf8'),
      integrationTokenIssuer:
        process.env.AUTH_INTEGRATION_TOKEN_ISSUER ?? 'nestjs-chat',
      integrationTokenAudience:
        process.env.AUTH_INTEGRATION_TOKEN_AUDIENCE ??
        'nestjs-chat-integration',
      // accessPrivateKey: fs.readFileSync(
      //   process.env.AUTH_ACCESS_PRIVATE_KEY_PATH as string,
      //   'utf8',
      // ),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Auth Config Error (Keys not found or invalid): ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
});
