import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const platformApiConfigSchema = z.object({
  platform_api_key: z.coerce.string(),
  platform_api_url: z.coerce.string(),
});

export const platformApiConfig = registerAs('platformApi', () => {
  return platformApiConfigSchema.parse({
    platform_api_key: process.env.PLATFORM_API_KEY,
    platform_api_url: process.env.PLATFORM_API_URL,
  });
});
