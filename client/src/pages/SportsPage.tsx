import React, { useState, useEffect, useCallback } from 'react';
import type { SessionPost, AuthService } from '@campus-event-finder/shared';
import { SessionCard } from './HomePage';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface SportsPageProps {
  onSelectSession: (session: SessionPost) => void;
  onCreatePost: () => void;
  authService?: AuthService;
  onRequireAuth?: () => void;
}

export function SportsPage({ onSelectSession, onCreatePost, authService, onRequireAuth }: SportsPageProps): React.ReactElement {
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
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);
      setSessions(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSessions(''); }, [fetchSessions]);

  function handleCreatePost(): void {
    if (authService && onRequireAuth && !authService.getSession()) {
      onRequireAuth();
    } else {
      onCreatePost();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">⚽ <span>Play Sessions</span></h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-bar" role="search">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                placeholder="Search by sport…"
                value={searchValue}
                onChange={e => { setSearchValue(e.target.value); void fetchSessions(e.target.value); }}
                aria-label="Search play sessions"
              />
              {searchValue && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSearchValue(''); void fetchSessions(''); }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleCreatePost} aria-label="Create a new play session post">
              + Post a Session
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="cards-grid cards-grid-3" aria-busy="true" aria-label="Loading sessions">
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 160, borderRadius: 'var(--radius)' }} className="skeleton" />
            ))}
          </div>
        )}

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="state-empty" role="status">
            <div className="state-empty-icon">🏅</div>
            <p>{searchValue ? 'No sessions match your search.' : 'No play sessions looking for participants right now.'}</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleCreatePost}>
              Be the first to post one
            </button>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && (
          <div className="cards-grid cards-grid-3" role="list">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} onClick={() => onSelectSession(session)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
