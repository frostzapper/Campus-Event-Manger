import React, { useState, useEffect, useCallback } from 'react';
import type { SessionPost, AuthService } from '@campus-event-finder/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface SportsTabProps {
  onSelectSession: (session: SessionPost) => void;
  onCreatePost: () => void;
  /** Optional auth service used to check whether the student is authenticated */
  authService?: AuthService;
  /** Called instead of onCreatePost when authService is provided but no valid session exists */
  onRequireAuth?: () => void;
}

/**
 * Renders session post list, search input, and create post button.
 * Fetches session posts from GET /sessions and GET /sessions?q={query}.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.3, 6.4, 7.1, 10.1
 */
export function SportsTab({
  onSelectSession,
  onCreatePost,
  authService,
  onRequireAuth,
}: SportsTabProps): React.ReactElement {
  const [sessions, setSessions] = useState<SessionPost[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async (query: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const url = query.trim()
        ? `${API_BASE_URL}/sessions?q=${encodeURIComponent(query.trim())}`
        : `${API_BASE_URL}/sessions`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load sessions (${response.status})`);
      }
      const data: SessionPost[] = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load full session list on mount (requirement 5.2)
  useEffect(() => {
    void fetchSessions('');
  }, [fetchSessions]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const query = e.target.value;
    setSearchValue(query);
    void fetchSessions(query);
  }

  function handleSearchClear(): void {
    setSearchValue('');
    void fetchSessions('');
  }

  function handleCreatePost(): void {
    if (authService !== undefined && onRequireAuth !== undefined) {
      const session = authService.getSession();
      if (session === null) {
        onRequireAuth();
        return;
      }
    }
    onCreatePost();
  }

  function renderEmptyState(): React.ReactElement {
    if (searchValue.trim()) {
      // Requirement 6.3: no matching session posts found
      return <p role="status">No play sessions found for that sport.</p>;
    }
    // Requirement 5.4: no active session posts with open slots
    return <p role="status">No play sessions currently looking for participants.</p>;
  }

  return (
    <div>
      {/* Requirement 7.1, 10.1: create post button – gated behind auth when authService is provided */}
      <button onClick={handleCreatePost} aria-label="Create post">
        Create Post
      </button>

      {/* Requirement 6.1: search input field */}
      <div>
        <input
          type="text"
          placeholder="Search play sessions..."
          value={searchValue}
          onChange={handleSearchChange}
          aria-label="Search play sessions"
        />
        {searchValue && (
          <button onClick={handleSearchClear} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>

      {isLoading && <p role="status">Loading sessions...</p>}

      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && (
        sessions.length === 0
          ? renderEmptyState()
          : (
            <ul>
              {sessions.map((session) => (
                <li
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectSession(session);
                    }
                  }}
                  aria-label={`View details for ${session.sport} session`}
                >
                  {/* Requirement 5.3: sport, participantsNeeded, skillLevel, scheduledAt, description */}
                  <strong>{session.sport}</strong>
                  <span> · {session.participantsNeeded} participant{session.participantsNeeded !== 1 ? 's' : ''} needed</span>
                  <span> · {session.skillLevel}</span>
                  <span> · {session.scheduledAt}</span>
                  <span> · {session.description}</span>
                </li>
              ))}
            </ul>
          )
      )}
    </div>
  );
}
