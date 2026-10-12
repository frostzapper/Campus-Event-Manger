import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../config/env';

/**
 * Rate limiting middleware factory functions.
 * Each factory creates a fresh limiter instance with no module-level state.
 * This allows tests to instantiate limiters with custom configuration (e.g., tiny windows).
 *
 * Note: Client IP detection relies on the remote address from the request.
 * In a production deployment behind a proxy, this must be configured with
 * app.set('trust proxy', 1) so req.ip returns the actual client IP, not the proxy's.
 * This will be done in a later phase when the deployment topology is finalized.
 */

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

/**
 * Per-IP rate limiter for authentication endpoints.
 * Limits total requests (login and register attempts) per IP address.
 * Defaults from config: 20 requests per 15 minutes.
 * Uses draft-7 RateLimit headers; legacy X-RateLimit headers are disabled.
 */
export function createAuthLimiter(options?: RateLimitOptions) {
  const windowMs = options?.windowMs ?? 15 * 60 * 1000; // 15 minutes
  const max = options?.max ?? config.rateLimitRequestsPerWindow;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many authentication attempts from this IP address. Please try again later.',
    skip: () => config.nodeEnv === 'test' && !options, // Skip limiting in test mode unless explicitly configured
  });
}

/**
 * Per-email rate limiter for login attempts.
 * Counts only failed login attempts. Successful logins bypass this limit.
 * Defaults from config: 10 failed attempts per 15 minutes per email.
 * Uses draft-7 RateLimit headers; legacy X-RateLimit headers are disabled.
 *
 * This limiter is applied conditionally in the login handler after validation,
 * using the normalized email from the request body.
 */
export function createEmailLimiter(options?: RateLimitOptions) {
  const windowMs = options?.windowMs ?? 15 * 60 * 1000; // 15 minutes
  const max = options?.max ?? config.rateLimitEmailAttemptsPerWindow;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Extract the normalized email from the request body
      // The loginSchema already validates and normalizes it
      const email = typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown';
      return email;
    },
    skip: () => config.nodeEnv === 'test' && !options, // Skip limiting in test mode unless explicitly configured
    skipSuccessfulRequests: true, // Only count failed attempts
    message: 'Too many failed login attempts for this email. Please try again later.',
  });
}
