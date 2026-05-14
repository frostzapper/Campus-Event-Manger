import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SportsTab } from './SportsTab';
import type { SessionPost } from '@campus-event-finder/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<SessionPost> = {}): SessionPost {
  return {
    id: 'sess-1',
    creatorId: 'student-1',
    sport: 'Basketball',
    participantsNeeded: 3,
    skillLevel: 'Intermediate',
    scheduledAt: '2099-06-15T14:00:00.000Z',
    description: 'Looking for players for a casual game.',
    isActive: true,
    ...overrides,
  };
}

const mockOnSelectSession = jest.fn();
const mockOnCreatePost = jest.fn();

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(sessions: SessionPost[]): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => sessions,
  } as Response);
}

function mockFetchError(): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({}),
  } as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('SportsTab', () => {
  describe('initial load', () => {
    it('calls GET /sessions on mount', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/sessions$/)
        );
      });
    });

    it('renders a list of sessions returned by the API', async () => {
      const sessions = [
        makeSession({ id: '1', sport: 'Basketball' }),
        makeSession({ id: '2', sport: 'Tennis' }),
      ];
      mockFetchSuccess(sessions);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(screen.getByText(/Basketball/)).toBeInTheDocument();
        expect(screen.getByText(/Tennis/)).toBeInTheDocument();
      });
    });

    it('shows empty-state message when no active sessions (requirement 5.4)', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(
          screen.getByText(/no play sessions currently looking for participants/i)
        ).toBeInTheDocument();
      });
    });

    it('shows an error message when the API call fails', async () => {
      mockFetchError();
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('session list item rendering (requirement 5.3)', () => {
    it('renders sport, participantsNeeded, skillLevel, scheduledAt, and description', async () => {
      const session = makeSession({
        sport: 'Soccer',
        participantsNeeded: 5,
        skillLevel: 'Beginner',
        scheduledAt: '2099-07-04T10:00:00.000Z',
        description: 'Casual kickabout in the park.',
      });
      mockFetchSuccess([session]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(screen.getByText(/Soccer/)).toBeInTheDocument();
        expect(screen.getByText(/5 participants needed/)).toBeInTheDocument();
        expect(screen.getByText(/Beginner/)).toBeInTheDocument();
        expect(screen.getByText(/2099-07-04T10:00:00\.000Z/)).toBeInTheDocument();
        expect(screen.getByText(/Casual kickabout in the park\./)).toBeInTheDocument();
      });
    });

    it('renders singular "participant needed" when participantsNeeded is 1', async () => {
      const session = makeSession({ participantsNeeded: 1 });
      mockFetchSuccess([session]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => {
        expect(screen.getByText(/1 participant needed/)).toBeInTheDocument();
      });
    });
  });

  describe('Create Post button (requirement 7.1)', () => {
    it('renders a "Create Post" button', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    });

    it('calls onCreatePost when the button is clicked', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      expect(mockOnCreatePost).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create Post auth gating (requirement 10.1)', () => {
    function makeAuthService(session: import('@campus-event-finder/shared').AuthSession | null) {
      return {
        getSession: jest.fn().mockReturnValue(session),
        login: jest.fn(),
        logout: jest.fn(),
        refresh: jest.fn(),
      };
    }

    const validSession: import('@campus-event-finder/shared').AuthSession = {
      studentId: 'student-1',
      token: 'tok',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };

    it('calls onCreatePost when authService returns a valid session', async () => {
      mockFetchSuccess([]);
      const authService = makeAuthService(validSession);
      const onRequireAuth = jest.fn();
      render(
        <SportsTab
          onSelectSession={mockOnSelectSession}
          onCreatePost={mockOnCreatePost}
          authService={authService}
          onRequireAuth={onRequireAuth}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      expect(mockOnCreatePost).toHaveBeenCalledTimes(1);
      expect(onRequireAuth).not.toHaveBeenCalled();
    });

    it('calls onRequireAuth instead of onCreatePost when authService returns null', async () => {
      mockFetchSuccess([]);
      const authService = makeAuthService(null);
      const onRequireAuth = jest.fn();
      render(
        <SportsTab
          onSelectSession={mockOnSelectSession}
          onCreatePost={mockOnCreatePost}
          authService={authService}
          onRequireAuth={onRequireAuth}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      expect(onRequireAuth).toHaveBeenCalledTimes(1);
      expect(mockOnCreatePost).not.toHaveBeenCalled();
    });

    it('calls onCreatePost directly when no authService is provided (backward compat)', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      expect(mockOnCreatePost).toHaveBeenCalledTimes(1);
    });

    it('calls onCreatePost when authService is provided but onRequireAuth is not', async () => {
      mockFetchSuccess([]);
      const authService = makeAuthService(null);
      render(
        <SportsTab
          onSelectSession={mockOnSelectSession}
          onCreatePost={mockOnCreatePost}
          authService={authService}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      // onRequireAuth not provided, so falls through to onCreatePost
      expect(mockOnCreatePost).toHaveBeenCalledTimes(1);
    });
  });

  describe('search (requirements 6.1, 6.3, 6.4)', () => {
    it('renders a search input field (requirement 6.1)', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      expect(screen.getByRole('textbox', { name: /search play sessions/i })).toBeInTheDocument();
    });

    it('calls GET /sessions?q={query} when user types in search (requirement 6.1)', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      const input = screen.getByRole('textbox', { name: /search play sessions/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'tennis' } });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/sessions\?q=tennis/)
        );
      });
    });

    it('shows "no play sessions found for that sport" when search returns empty (requirement 6.3)', async () => {
      mockFetchSuccess([]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      const input = screen.getByRole('textbox', { name: /search play sessions/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/no play sessions found for that sport/i)).toBeInTheDocument();
      });
    });

    it('restores full list when search is cleared via Clear button (requirement 6.4)', async () => {
      const allSessions = [makeSession({ id: '1', sport: 'Volleyball' })];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response);

      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(screen.getByText(/Volleyball/)).toBeInTheDocument());

      const input = screen.getByRole('textbox', { name: /search play sessions/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'xyz' } });
      });
      await waitFor(() =>
        expect(screen.getByText(/no play sessions found for that sport/i)).toBeInTheDocument()
      );

      const clearBtn = screen.getByRole('button', { name: /clear search/i });
      await act(async () => {
        fireEvent.click(clearBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Volleyball/)).toBeInTheDocument();
        const calls = (global.fetch as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall).toMatch(/\/sessions$/);
      });
    });

    it('restores full list when search input is manually cleared to empty string (requirement 6.4)', async () => {
      const allSessions = [makeSession({ id: '1', sport: 'Badminton' })];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response);

      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(screen.getByText(/Badminton/)).toBeInTheDocument());

      const input = screen.getByRole('textbox', { name: /search play sessions/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'xyz' } });
      });
      await waitFor(() =>
        expect(screen.getByText(/no play sessions found for that sport/i)).toBeInTheDocument()
      );

      await act(async () => {
        fireEvent.change(input, { target: { value: '' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Badminton/)).toBeInTheDocument();
      });
    });
  });

  describe('session selection', () => {
    it('calls onSelectSession with the correct session when an item is clicked', async () => {
      const session = makeSession({ id: 'sess-42', sport: 'Rugby' });
      mockFetchSuccess([session]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(screen.getByText(/Rugby/)).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /View details for Rugby session/i }));
      expect(mockOnSelectSession).toHaveBeenCalledWith(session);
    });

    it('calls onSelectSession when Enter key is pressed on a session item', async () => {
      const session = makeSession({ id: 'sess-43', sport: 'Frisbee' });
      mockFetchSuccess([session]);
      render(<SportsTab onSelectSession={mockOnSelectSession} onCreatePost={mockOnCreatePost} />);
      await waitFor(() => expect(screen.getByText(/Frisbee/)).toBeInTheDocument());

      fireEvent.keyDown(
        screen.getByRole('button', { name: /View details for Frisbee session/i }),
        { key: 'Enter' }
      );
      expect(mockOnSelectSession).toHaveBeenCalledWith(session);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

import * as fc from 'fast-check';

// Feature: campus-event-finder, Property 10: Session post rendering completeness
describe('Property 10: Session post rendering completeness (Requirements 5.3)', () => {
  /**
   * Validates: Requirements 5.3
   *
   * For any SessionPost object, the rendered list item should always include
   * the sport name, number of participants needed, skill level, scheduled
   * date and time, and description.
   */
  it('always renders sport, participantsNeeded, skillLevel, scheduledAt, and description', async () => {
    const sessionArb = fc
      .tuple(
        fc.uuid(),                                                          // id
        fc.uuid(),                                                          // creatorId
        fc.hexaString({ minLength: 6, maxLength: 6 }),                     // sport suffix
        fc.integer({ min: 1, max: 20 }),                                   // participantsNeeded
        fc.hexaString({ minLength: 6, maxLength: 6 }),                     // skillLevel suffix
        fc.date({ min: new Date('2099-01-01'), max: new Date('2099-12-31') })
          .map((d) => d.toISOString()),                                     // scheduledAt
        fc.hexaString({ minLength: 6, maxLength: 20 }),                    // description suffix
      )
      .map(([id, creatorId, sportSuffix, participantsNeeded, skillSuffix, scheduledAt, descSuffix]) => ({
        id,
        creatorId,
        sport: `Sport-${sportSuffix}`,
        participantsNeeded,
        skillLevel: `Skill-${skillSuffix}`,
        scheduledAt,
        description: `Desc-${descSuffix}`,
        isActive: true,
      } as SessionPost));

    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => [session],
        } as Response);

        const { unmount } = render(
          <SportsTab onSelectSession={jest.fn()} onCreatePost={jest.fn()} />
        );

        try {
          await waitFor(() => {
            expect(screen.getByText(new RegExp(escapeRegex(session.sport)))).toBeInTheDocument();
          });

          const listItem = screen.getByRole('button', {
            name: new RegExp(`View details for ${escapeRegex(session.sport)} session`, 'i'),
          });

          // 1. Sport name must always be present
          expect(listItem).toHaveTextContent(session.sport);

          // 2. Participants needed must always be present
          expect(listItem).toHaveTextContent(String(session.participantsNeeded));

          // 3. Skill level must always be present
          expect(listItem).toHaveTextContent(session.skillLevel);

          // 4. Scheduled date/time must always be present
          expect(listItem).toHaveTextContent(session.scheduledAt);

          // 5. Description must always be present
          expect(listItem).toHaveTextContent(session.description);
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);
});// Feature: campus-event-finder, Property 12: Session post search clear restores full list
describe('Property 12: Session post search clear restores full list (Requirements 6.4)', () => {
  /**
   * Validates: Requirements 6.4
   *
   * For any initial list of active session posts and any search query applied
   * to it, clearing the search input should restore the result to the same
   * set of active posts as the unfiltered list.
   */
  it('restores the full session list after a search query is cleared', async () => {
    const sessionArb = fc
      .tuple(fc.uuid(), fc.hexaString({ minLength: 6, maxLength: 6 }))
      .map(([id, suffix]) => ({
        id,
        creatorId: 'student-1',
        sport: `Sport-${suffix}`,
        participantsNeeded: 2,
        skillLevel: 'Any',
        scheduledAt: '2099-06-15T14:00:00.000Z',
        description: 'A session',
        isActive: true,
      } as SessionPost));

    const sessionsArb = fc.array(sessionArb, { minLength: 1, maxLength: 5 });

    // Query that won't match any generated sport name (sports are "Sport-<hex6>"; query uses non-hex chars)
    const queryArb = fc
      .stringOf(fc.constantFrom(...'ghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(sessionsArb, queryArb, async (allSessions, query) => {
        global.fetch = jest.fn()
          .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response)
          .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
          .mockResolvedValueOnce({ ok: true, json: async () => allSessions } as Response)
          .mockResolvedValue({ ok: true, json: async () => allSessions } as Response);

        const { unmount } = render(
          <SportsTab onSelectSession={jest.fn()} onCreatePost={jest.fn()} />
        );

        try {
          // Wait for the initial full list to render
          await waitFor(() => {
            expect(screen.getByText(new RegExp(allSessions[0].sport))).toBeInTheDocument();
          });

          // Type a search query that returns no results
          const input = screen.getByRole('textbox', { name: /search play sessions/i });
          await act(async () => {
            fireEvent.change(input, { target: { value: query } });
          });

          // Wait for the empty search state
          await waitFor(() => {
            expect(screen.getByText(/no play sessions found for that sport/i)).toBeInTheDocument();
          });

          // Click the Clear button to restore the full list
          const clearBtn = screen.getByRole('button', { name: /clear search/i });
          await act(async () => {
            fireEvent.click(clearBtn);
          });

          // All sessions from the original full list must be visible again
          await waitFor(() => {
            for (const session of allSessions) {
              expect(screen.getByText(new RegExp(session.sport))).toBeInTheDocument();
            }
          });

          // The last fetch call must have been for the unfiltered list (no query param)
          const calls = (global.fetch as jest.Mock).mock.calls;
          const lastUrl = calls[calls.length - 1][0] as string;
          expect(lastUrl).toMatch(/\/sessions$/);
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 60000);
});

/** Escapes special regex characters in a string so it can be used in a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
