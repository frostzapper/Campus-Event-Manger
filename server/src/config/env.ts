import { envSchema } from './schema';

/**
 * Validated, typed application configuration parsed from process.env at startup.
 * Fails fast (process.exit(1)) if required variables are missing or invalid.
 * Import `config` instead of reading process.env directly anywhere in the server.
 */

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
  bcryptCost: data.BCRYPT_COST,
} as const;

export type Config = typeof config;
