import * as fc from 'fast-check';
import { AuthServiceImpl } from './AuthServiceImpl';
import type { AuthSession } from '@campus-event-finder/shared';

/**
 * Tests for AuthServiceImpl
 * Requirements: 10.2, 10.3, 10.4
 */

const SESSION_STORAGE_KEY = 'campus_event_finder_session';

// Helper to build a valid AuthSession with an expiry in the future
function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  return {
    studentId: 'student-1',
    token: 'jwt.token.here',
    expiresAt,
    ...overrides,
  };
}

// Helper to build an expired AuthSession
function makeExpiredSession(overrides: Partial<AuthSession> = {}): AuthSession {
  const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
  return {
    studentId: 'student-1',
    token: 'jwt.token.here',
    expiresAt,
    ...overrides,
  };
}

// ─── localStorage mock ────────────────────────────────────────────────────────

let localStorageStore: Record<string, string> = {};

beforeEach(() => {
  localStorageStore = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
    return localStorageStore[key] ?? null;
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    localStorageStore[key] = value;
  });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
    delete localStorageStore[key];
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── fetch mock helpers ───────────────────────────────────────────────────────

function mockFetchSuccess(body: unknown, status = 200): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

function mockFetchFailure(status = 401): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
  } as unknown as Response);
}

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthServiceImpl.login', () => {
  it('calls POST /auth/login with email and password', async () => {
    const session = makeSession();
    mockFetchSuccess(session);
    const service = new AuthServiceImpl();

    await service.login('student@campus.edu', 'secret');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'student@campus.edu', password: 'secret' }),
      }),
    );
  });

  it('returns the AuthSession on success and stores it in localStorage', async () => {
    const session = makeSession();
    mockFetchSuccess(session);
    const service = new AuthServiceImpl();

    const result = await service.login('student@campus.edu', 'secret');

    expect(result).toEqual(session);
    expect(localStorageStore[SESSION_STORAGE_KEY]).toBe(JSON.stringify(session));
  });

  it('throws an error when credentials are invalid (Requirement 10.3)', async () => {
    mockFetchFailure(401);
    const service = new AuthServiceImpl();

    await expect(service.login('bad@campus.edu', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('does NOT store a session when login fails', async () => {
    mockFetchFailure(401);
    const service = new AuthServiceImpl();

    await expect(service.login('bad@campus.edu', 'wrong')).rejects.toThrow();
    expect(localStorageStore[SESSION_STORAGE_KEY]).toBeUndefined();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthServiceImpl.logout', () => {
  it('removes the session from localStorage', () => {
    const session = makeSession();
    localStorageStore[SESSION_STORAGE_KEY] = JSON.stringify(session);
    const service = new AuthServiceImpl();

    service.logout();

    expect(localStorageStore[SESSION_STORAGE_KEY]).toBeUndefined();
  });

  it('does not throw when there is no stored session', () => {
    const service = new AuthServiceImpl();
    expect(() => service.logout()).not.toThrow();
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe('AuthServiceImpl.getSession', () => {
  it('returns null when no session is stored', () => {
    const service = new AuthServiceImpl();
    expect(service.getSession()).toBeNull();
  });

  it('returns the stored session when it is valid and not expired (Requirement 10.1)', () => {
    const session = makeSession();
    localStorageStore[SESSION_STORAGE_KEY] = JSON.stringify(session);
    const service = new AuthServiceImpl();

    expect(service.getSession()).toEqual(session);
  });

  it('returns null and clears storage when the session is expired (Requirement 10.4)', () => {
    const expired = makeExpiredSession();
    localStorageStore[SESSION_STORAGE_KEY] = JSON.stringify(expired);
    const service = new AuthServiceImpl();

    const result = service.getSession();

    expect(result).toBeNull();
    expect(localStorageStore[SESSION_STORAGE_KEY]).toBeUndefined();
  });

  it('returns null and clears storage when the stored value is malformed JSON', () => {
    localStorageStore[SESSION_STORAGE_KEY] = 'not-valid-json{{{';
    const service = new AuthServiceImpl();

    const result = service.getSession();

    expect(result).toBeNull();
    expect(localStorageStore[SESSION_STORAGE_KEY]).toBeUndefined();
  });
});

// ─── refresh ─────────────────────────────────────────────────────────────────

describe('AuthServiceImpl.refresh', () => {
  it('calls POST /auth/refresh with the Bearer token', async () => {
    const newSession = makeSession({ token: 'new.jwt.token' });
    mockFetchSuccess(newSession);
    const service = new AuthServiceImpl();

    await service.refresh('old.jwt.token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer old.jwt.token',
        }),
      }),
    );
  });

  it('returns the new AuthSession and stores it on success (Requirement 10.4)', async () => {
    const newSession = makeSession({ token: 'new.jwt.token' });
    mockFetchSuccess(newSession);
    const service = new AuthServiceImpl();

    const result = await service.refresh('old.jwt.token');

    expect(result).toEqual(newSession);
    expect(localStorageStore[SESSION_STORAGE_KEY]).toBe(JSON.stringify(newSession));
  });

  it('throws when the refresh request fails', async () => {
    mockFetchFailure(401);
    const service = new AuthServiceImpl();

    await expect(service.refresh('expired.token')).rejects.toThrow('Failed to refresh session');
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

/**
 * Property: getSession always returns null for any expired session
 * Validates: Requirements 10.4
 */
describe('Property: getSession returns null for any expired session', () => {
  it('returns null for any session whose expiresAt is in the past', () => {
    const service = new AuthServiceImpl();

    // Generate sessions with expiresAt strictly in the past
    const pastIso = fc
      .date({ min: new Date('2000-01-01'), max: new Date(Date.now() - 1000) })
      .map((d) => d.toISOString());

    const expiredSessionArb = fc.record({
      studentId: fc.string({ minLength: 1, maxLength: 50 }),
      token: fc.string({ minLength: 1, maxLength: 200 }),
      expiresAt: pastIso,
    });

    fc.assert(
      fc.property(expiredSessionArb, (session: AuthSession) => {
        localStorageStore[SESSION_STORAGE_KEY] = JSON.stringify(session);
        const result = service.getSession();
        return result === null;
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property: getSession always returns the session for any non-expired session
 * Validates: Requirements 10.1, 10.2
 */
describe('Property: getSession returns the session for any valid non-expired session', () => {
  it('returns the stored session for any session whose expiresAt is in the future', () => {
    const service = new AuthServiceImpl();

    // Generate sessions with expiresAt strictly in the future
    const futureIso = fc
      .date({ min: new Date(Date.now() + 2000), max: new Date('2099-12-31') })
      .map((d) => d.toISOString());

    const validSessionArb = fc.record({
      studentId: fc.string({ minLength: 1, maxLength: 50 }),
      token: fc.string({ minLength: 1, maxLength: 200 }),
      expiresAt: futureIso,
    });

    fc.assert(
      fc.property(validSessionArb, (session: AuthSession) => {
        localStorageStore[SESSION_STORAGE_KEY] = JSON.stringify(session);
        const result = service.getSession();
        return result !== null && result.token === session.token && result.studentId === session.studentId;
      }),
      { numRuns: 100 },
    );
  });
});
