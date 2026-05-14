import type { AuthService, AuthSession } from '@campus-event-finder/shared';

const SESSION_STORAGE_KEY = 'campus_event_finder_session';
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Client-side implementation of AuthService.
 * Manages login, registration, token storage, and session lifecycle.
 */
export class AuthServiceImpl implements AuthService {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Invalid credentials');
    }

    const session: AuthSession = await response.json();
    this.storeSession(session);
    return session;
  }

  async signup(name: string, email: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Registration failed');
    }

    const session: AuthSession = await response.json();
    this.storeSession(session);
    return session;
  }

  async refresh(token: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh session');
    }

    const session: AuthSession = await response.json();
    this.storeSession(session);
    return session;
  }

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  getSession(): AuthSession | null {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    try {
      const session: AuthSession = JSON.parse(stored);
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt <= new Date()) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      this.logout();
      return null;
    }
  }

  private storeSession(session: AuthSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}
