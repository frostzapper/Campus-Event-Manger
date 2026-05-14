/**
 * Represents an authenticated session for a student.
 * Requirements: 10.2, 10.4
 */
export interface AuthSession {
  studentId: string;
  /** JSON Web Token */
  token: string;
  /** ISO 8601 datetime string */
  expiresAt: string;
}
