import { z } from 'zod';

/**
 * Validated, typed application configuration parsed from process.env at startup.
 * Fails fast (process.exit(1)) if required variables are missing or invalid.
 * Import `config` instead of reading process.env directly anywhere in the server.
 */

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().default(''),
    API_PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    AUTH_RAW_BEARER_IDS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Refuse to start if AUTH_RAW_BEARER_IDS is set outside of test.
    if (data.AUTH_RAW_BEARER_IDS !== undefined && data.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_RAW_BEARER_IDS'],
        message:
          'AUTH_RAW_BEARER_IDS must not be set outside NODE_ENV=test. ' +
          'Remove it from the environment before starting the server.',
      });
    }
    // Require a strong JWT_SECRET in non-test environments.
    if (data.NODE_ENV !== 'test' && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET must be at least 32 characters when NODE_ENV is not "test". ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('[config] Server startup aborted — invalid environment configuration:');
  const errors = result.error.flatten().fieldErrors;
  for (const [field, messages] of Object.entries(errors)) {
    for (const msg of messages ?? []) {
      console.error(`  ${field}: ${msg}`);
    }
  }
  process.exit(1);
}

const data = result.data;

export const config = {
  databaseUrl: data.DATABASE_URL,
  jwtSecret: data.JWT_SECRET,
  port: data.API_PORT,
  nodeEnv: data.NODE_ENV,
  /** True only in NODE_ENV=test when AUTH_RAW_BEARER_IDS is set. Never true in production. */
  allowRawBearerIds: data.NODE_ENV === 'test' && data.AUTH_RAW_BEARER_IDS !== undefined,
} as const;

export type Config = typeof config;
