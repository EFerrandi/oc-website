import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(16, 'must be at least 16 characters'),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  DATABASE_PATH: z.string().min(1).default('data/oc.db'),
  UPLOAD_DIR: z.string().min(1).default('data/uploads'),
  PREVIEW_DIR: z.string().min(1).default('data/uploads/previews'),
  PREVIEW_MAX_EDGE: z.coerce.number().int().positive().default(800),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(104_857_600),
  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(120),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

// Fails fast at startup naming the offending key, rather than surfacing as a
// confusing runtime error later.
export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const value = parsed.data;
  const root = process.cwd();

  return {
    port: value.PORT,
    sessionSecret: value.SESSION_SECRET,
    adminPasswordHash: value.ADMIN_PASSWORD_HASH,
    databasePath: path.resolve(root, value.DATABASE_PATH),
    uploadDir: path.resolve(root, value.UPLOAD_DIR),
    previewDir: path.resolve(root, value.PREVIEW_DIR),
    previewMaxEdge: value.PREVIEW_MAX_EDGE,
    maxUploadBytes: value.MAX_UPLOAD_BYTES,
    sessionIdleMs: value.SESSION_IDLE_MINUTES * 60 * 1000,
    nodeEnv: value.NODE_ENV,
    isProduction: value.NODE_ENV === 'production'
  };
}
