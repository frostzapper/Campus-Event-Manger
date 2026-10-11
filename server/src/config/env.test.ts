/**
 * Unit tests for the env config schema.
 *
 * We test the zod schema directly rather than importing env.ts, because env.ts
 * calls process.exit(1) on validation failure and that would terminate Jest.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reproduce the schema from env.ts so we can call safeParse without side effects.
// If the schema in env.ts changes, keep this in sync.
// ---------------------------------------------------------------------------

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
    if (data.AUTH_RAW_BEARER_IDS !== undefined && data.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_RAW_BEARER_IDS'],
        message: 'AUTH_RAW_BEARER_IDS must not be set outside NODE_ENV=test.',
      });
    }
    if (data.NODE_ENV !== 'test' && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters when NODE_ENV is not "test".',
      });
    }
  });

const VALID_SECRET = 'a'.repeat(32);
const VALID_DB_URL = 'postgresql://user:pass@localhost:5432/db';

// ---------------------------------------------------------------------------
// DATABASE_URL validation
// ---------------------------------------------------------------------------

describe('env config: DATABASE_URL', () => {
  it('fails when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('DATABASE_URL');
    }
  });

  it('fails when DATABASE_URL is empty', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: '',
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// JWT_SECRET validation
// ---------------------------------------------------------------------------

describe('env config: JWT_SECRET in non-test environments', () => {
  it('fails when JWT_SECRET is missing (development)', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.flatten());
      expect(msg).toContain('JWT_SECRET');
    }
  });

  it('fails when JWT_SECRET is shorter than 32 characters (development)', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: 'tooshort',
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.flatten());
      expect(msg).toContain('JWT_SECRET');
    }
  });

  it('fails when JWT_SECRET is shorter than 32 characters (production)', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: 'short',
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a JWT_SECRET of exactly 32 characters', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(true);
  });

  it('allows a short JWT_SECRET when NODE_ENV is "test"', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: 'short',
      NODE_ENV: 'test',
    });
    expect(result.success).toBe(true);
  });

  it('allows JWT_SECRET to be empty when NODE_ENV is "test"', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      NODE_ENV: 'test',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AUTH_RAW_BEARER_IDS validation
// ---------------------------------------------------------------------------

describe('env config: AUTH_RAW_BEARER_IDS', () => {
  it('fails when AUTH_RAW_BEARER_IDS is set in production', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'production',
      AUTH_RAW_BEARER_IDS: 'true',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.flatten());
      expect(msg).toContain('AUTH_RAW_BEARER_IDS');
    }
  });

  it('fails when AUTH_RAW_BEARER_IDS is set in development', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'development',
      AUTH_RAW_BEARER_IDS: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('allows AUTH_RAW_BEARER_IDS in NODE_ENV=test', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      NODE_ENV: 'test',
      AUTH_RAW_BEARER_IDS: 'true',
    });
    expect(result.success).toBe(true);
  });

  it('succeeds without AUTH_RAW_BEARER_IDS in production', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Valid full config
// ---------------------------------------------------------------------------

describe('env config: valid configuration', () => {
  it('parses a complete valid config and exposes typed fields', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
      API_PORT: '4000',
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(VALID_DB_URL);
      expect(result.data.JWT_SECRET).toBe(VALID_SECRET);
      expect(result.data.API_PORT).toBe(4000);
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('applies defaults for optional fields', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: VALID_DB_URL,
      JWT_SECRET: VALID_SECRET,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe('development');
    }
  });
});
