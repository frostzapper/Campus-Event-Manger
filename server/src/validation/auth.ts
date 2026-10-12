import { z } from 'zod';

/**
 * Validation schemas for authentication endpoints.
 * All validation failures return 400 with a consistent error shape.
 */

/**
 * POST /auth/register validation schema.
 * - email: trimmed, lowercased, valid format, max 254 chars (RFC 5321)
 * - password: 8-72 bytes (bcrypt limitation)
 * - displayName: trimmed, 1-80 chars
 */
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(254, 'Email must be at most 254 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (val) => Buffer.byteLength(val, 'utf8') <= 72,
      'Password must be at most 72 bytes',
    ),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name must not be empty')
    .max(80, 'Display name must be at most 80 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * POST /auth/login validation schema.
 * - email: string (no format validation - login should work even with malformed emails)
 * - password: any non-empty string (existing users may have any password)
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'email must not be empty'),
  password: z.string().min(1, 'password must not be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;
