import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@campus-event-finder/shared';
import { EventCard, EventCardSkeleton } from '../pages/HomePage';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface Suggestion {
  id: string;
  displayName: string;
  followerCount: number;
  eventCount: number;
}

interface FollowingFeedProps {
  authToken: string;
  onSelectEvent: (event: Event) => void;
  onViewProfile: (organizerId: string) => void;
}

export function FollowingFeed({ authToken, onSelectEvent, onViewProfile }: FollowingFeedProps): React.ReactElement {
  const [feed, setFeed] = useState<Event[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const headers = { Authorization: `Bearer ${authToken}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, sugRes] = await Promise.all([
        fetch(`${API}/follows/feed`, { headers }),
        fetch(`${API}/follows/suggestions`, { headers }),
      ]);
      if (feedRes.ok) setFeed(await feedRes.json());
      if (sugRes.ok) setSuggestions(await sugRes.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { void load(); }, [load]);

  async function handleFollow(targetId: string): Promise<void> {
    const isNowFollowing = !followingIds.has(targetId);
    const method = isNowFollowing ? 'POST' : 'DELETE';
    const res = await fetch(`${API}/follows/${targetId}`, { method, headers });
    if (res.ok) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isNowFollowing) next.add(targetId); else next.delete(targetId);
        return next;
      });
      if (isNowFollowing) void load(); // refresh feed after following
    }
  }

  return (
    <section className="section" aria-labelledby="feed-heading">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" id="feed-heading">
            📡 <span>Following</span> Feed
          </h2>
        </div>

        <div className="feed-layout">
          {/* Feed */}
          <div className="feed-main">
            {loading ? (
              <div className="cards-grid cards-grid-3">
                {[1,2,3].map(i => <EventCardSkeleton key={i} />)}
              </div>
            ) : feed.length === 0 ? (
              <div className="feed-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📡</div>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Your feed is empty</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Follow organizers to see their upcoming events here.
                </p>
              </div>
            ) : (
              <div className="cards-grid cards-grid-3">
                {feed.map(e => (
                  <EventCard
                    key={e.id} event={e}
                    onClick={() => onSelectEvent(e)}
                    isAuthenticated={true}
                    onRequireAuth={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Suggestions sidebar */}
          {suggestions.length > 0 && (
            <aside className="feed-sidebar" aria-label="Suggested organizers">
              <h3 className="feed-sidebar-title">👥 Suggested Organizers</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {suggestions.map(s => {
                  const following = followingIds.has(s.id);
                  const displayName = s.displayName?.trim() || 'Organizer';
                  const initials = displayName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
                  return (
                    <li key={s.id} className="feed-suggestion">
                      <button
                        className="feed-suggestion-avatar"
                        onClick={() => onViewProfile(s.id)}
                        aria-label={`View ${s.displayName}'s profile`}
                      >
                        {initials}
                      </button>
                      <div className="feed-suggestion-info" onClick={() => onViewProfile(s.id)} style={{ cursor: 'pointer' }}>
                        <span className="feed-suggestion-name">{s.displayName}</span>
                        <span className="feed-suggestion-meta">
                          {s.followerCount} followers · {s.eventCount} events
                        </span>
                      </div>
                      <button
                        className={`btn btn-sm ${following ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => { void handleFollow(s.id); }}
                        aria-label={following ? `Unfollow ${s.displayName}` : `Follow ${s.displayName}`}
                      >
                        {following ? '✓' : '+ Follow'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
