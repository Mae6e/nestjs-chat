import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const uploadConfigSchema = z.object({
  dir: z.string().min(1).default('uploads'),
  publicPrefix: z.string().min(1).default('/uploads'),
  maxFileSize: z.coerce.number().positive().default(DEFAULT_MAX_FILE_SIZE),
});

export const uploadConfig = registerAs('upload', () => {
  return uploadConfigSchema.parse({
    dir: process.env.UPLOAD_DIR,
    publicPrefix: process.env.UPLOAD_PUBLIC_PREFIX,
    maxFileSize: process.env.UPLOAD_MAX_FILE_SIZE,
  });
});
