import { z } from 'zod';

/**
 * The shape of the process environment.
 *
 * Validated once at boot (see `config.module.ts`). A missing or malformed
 * required value stops the process with a readable list of problems rather than
 * failing deep inside a request handler later. Optional integrations (R2, Groq,
 * Gemini, FCM) are allowed to be absent — the modules that need them check at
 * point of use and degrade, matching how `apps/web` treats the Groq key.
 */
const durationString = z
  .string()
  .regex(/^\d+(ms|s|m|h|d)$/, 'expected a duration like "15m", "30d", "500ms"');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'use at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'use at least 32 characters'),
  JWT_ACCESS_TTL: durationString.default('15m'),
  JWT_REFRESH_TTL: durationString.default('30d'),
  OTP_TTL: durationString.default('5m'),
  OTP_DEV_ECHO: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional().or(z.literal('')),

  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Parse `process.env`, throwing a single readable error on failure. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}
