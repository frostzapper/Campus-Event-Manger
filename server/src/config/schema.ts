import { z } from 'zod';

/**
 * Validation schema for environment variables.
 * No side effects: no process.exit, no reading process.env.
 * Used by env.ts and env.test.ts.
 */

export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().default(''),
    API_PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('production'),
    AUTH_RAW_BEARER_IDS: z.string().optional(),
    BCRYPT_COST: z.coerce.number().int().min(10).max(14).default(12),
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
