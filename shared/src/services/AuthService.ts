import type { AuthSession } from '../models/AuthSession';

/**
 * Manages student authentication, token storage, and session lifecycle.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export interface AuthService {
  /**
   * Authenticates the student with campus credentials.
   * Returns an AuthSession containing a JWT on success.
   * Throws an authentication error if credentials are invalid.
   * Requirements: 10.2, 10.3
   */
  login(email: string, password: string): Promise<AuthSession>;
  
  /**
   * Creates a new student account.
   * Returns an AuthSession containing a JWT on success.
   */
  signup(name: string, email: string, password: string): Promise<AuthSession>;

  /**
   * Refreshes an expiring session token.
   * Returns a new AuthSession with an updated token and expiry.
   * Requirements: 10.4
   */
  refresh(token: string): Promise<AuthSession>;

  /**
   * Clears the stored session, effectively logging the student out.
   */
  logout(): void;

  /**
   * Returns the current AuthSession if one exists and is not expired, or null.
   * Requirements: 10.1
   */
  getSession(): AuthSession | null;
}
