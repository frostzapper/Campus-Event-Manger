import React, { useState, useEffect, useCallback } from 'react';
import type { Event, SessionPost } from '@campus-event-finder/shared';
import { FollowingFeed } from '../components/FollowingFeed';
import { normalizeEventsListResponse } from '../utils/normalizeEventsListResponse';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

const HOW_STEPS = [
  { num: '1', title: 'Browse Events', desc: 'Explore upcoming campus events filtered by date, type, or keyword.' },
  { num: '2', title: 'Find Sessions', desc: 'Discover one-time sports sessions looking for extra players.' },
  { num: '3', title: 'Get Directions', desc: 'Not on campus? Get Google Maps directions straight to the venue.' },
  { num: '4', title: 'Post & Connect', desc: 'Sign in to post your own play session and find teammates.' },
];

interface HomePageProps {
  onExploreEvents: () => void;
  onExploreSports: () => void;
  onSelectEvent: (event: Event) => void;
  onSelectSession: (session: SessionPost) => void;
  isAuthenticated: boolean;
  authToken?: string;
  onRequireAuth: (action: { type: 'register'; event: Event }, prompt: string) => void;
  onViewOrganizer?: (organizerId: string) => void;
}

export function HomePage({ onExploreEvents, onExploreSports, onSelectEvent, onSelectSession, isAuthenticated, authToken, onRequireAuth, onViewOrganizer }: HomePageProps): React.ReactElement {
  const [events, setEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<SessionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, sesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/events`),
        fetch(`${API_BASE_URL}/sessions`),
      ]);
      if (evRes.ok) setEvents(normalizeEventsListResponse(await evRes.json()));
      if (sesRes.ok) {
        const sesBody = await sesRes.json();
        setSessions(Array.isArray(sesBody) ? sesBody : []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const trending = events.slice(0, 3);
  const upcoming = events.slice(0, 6);
  const sportsSample = sessions.slice(0, 3);

  function handleHeroSearch(e: React.FormEvent): void {
    e.preventDefault();
    onExploreEvents();
  }

  return (
    <>
      {/* Hero */}
      <section className="hero" aria-label="Hero">
        <div className="hero-shapes" aria-hidden="true">
          <div className="hero-shape" />
          <div className="hero-shape" />
          <div className="hero-shape" />
        </div>
        <div className="container hero-content">
          <div className="hero-badge">🎉 Your campus, your events</div>
          <h1>Discover What's<br />Happening on Campus</h1>
          <p>Find events, join sports sessions, and connect with your campus community — all in one place.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onExploreEvents}>🔍 Explore Events</button>
            <button className="btn btn-outline btn-lg" onClick={onExploreSports}>⚽ Find Play Sessions</button>
          </div>
          <form className="hero-search" onSubmit={handleHeroSearch} role="search" style={{ position: 'relative' }}>
            <input
              type="search"
              placeholder="Search events, sports, topics…"
              value={heroSearch}
              onChange={e => {
                setHeroSearch(e.target.value);
                // Simple suggestion logic
                if (e.target.value.trim().length > 1) {
                  fetch(`${API_BASE_URL}/events/suggestions?q=${encodeURIComponent(e.target.value)}`)
                    .then(r => r.ok ? r.json() : [])
                    .then(setSuggestions)
                    .catch(() => {});
                } else {
                  setSuggestions([]);
                }
              }}
              onFocus={() => { if (heroSearch.length > 1) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200) /* delay to allow click */}
              aria-label="Search events"
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="autocomplete-dropdown" style={{ top: '100%', left: 0, right: 0, textAlign: 'left' }}>
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    className="suggestion-item"
                    onClick={() => {
                      setHeroSearch(s.title);
                      onExploreEvents();
                    }}
                  >
                    <span>📅</span> {s.title}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>


      {/* Trending Events */}
      <section className="section section-alt" aria-labelledby="trending-heading">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title" id="trending-heading">🔥 <span>Trending</span> Events</h2>
            <button className="btn btn-outline btn-sm" onClick={onExploreEvents}>View all</button>
          </div>
          <div className="cards-grid cards-grid-3" role="list">
            {loading
              ? [1,2,3].map(i => <EventCardSkeleton key={i} />)
              : trending.map(event => <EventCard key={event.id} event={event} onClick={() => onSelectEvent(event)} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />)
            }
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="section" aria-labelledby="upcoming-heading">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title" id="upcoming-heading">📅 <span>Upcoming</span> Events</h2>
            <button className="btn btn-outline btn-sm" onClick={onExploreEvents}>View all</button>
          </div>
          <div className="cards-grid cards-grid-3" role="list">
            {loading
              ? [1,2,3,4,5,6].map(i => <EventCardSkeleton key={i} />)
              : upcoming.map(event => <EventCard key={event.id} event={event} onClick={() => onSelectEvent(event)} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />)
            }
          </div>
        </div>
      </section>

      {/* Sports Sessions */}
      {(loading || sportsSample.length > 0) && (
        <section className="section section-alt" aria-labelledby="sports-heading">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title" id="sports-heading">⚽ <span>Play Sessions</span> Near You</h2>
              <button className="btn btn-outline btn-sm" onClick={onExploreSports}>View all</button>
            </div>
            <div className="cards-grid cards-grid-3" role="list">
              {loading
                ? [1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 'var(--radius)' }} className="skeleton" />)
                : sportsSample.map(session => <SessionCard key={session.id} session={session} onClick={() => onSelectSession(session)} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* Following Feed — only for authenticated users */}
      {isAuthenticated && authToken && (
        <FollowingFeed
          authToken={authToken}
          onSelectEvent={onSelectEvent}
          onViewProfile={id => onViewOrganizer?.(id)}
        />
      )}

      {/* How It Works */}
      <section className="section" aria-labelledby="how-heading">
        <div className="container">
          <div className="section-header" style={{ justifyContent: 'center' }}>
            <h2 className="section-title" id="how-heading" style={{ textAlign: 'center' }}>How It <span>Works</span></h2>
          </div>
          <div className="how-grid" role="list">
            {HOW_STEPS.map(step => (
              <div key={step.num} className="how-step" role="listitem">
                <div className="how-step-num" aria-hidden="true">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ── Card components ───────────────────────────────────────────────────────

const SUBTYPE_GRADIENTS: Record<string, string> = {
  technical: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  cultural:  'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
  sports:    'linear-gradient(135deg,#f77062 0%,#fe5196 100%)',
};
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#6c63ff 0%,#a78bfa 50%,#f472b6 100%)';

function getBannerGradient(subtype?: string): string {
  if (!subtype) return DEFAULT_GRADIENT;
  return SUBTYPE_GRADIENTS[subtype.toLowerCase()] ?? DEFAULT_GRADIENT;
}

export function EventCard({ event, onClick, isAuthenticated, onRequireAuth }: {
  event: Event;
  onClick: () => void;
  isAuthenticated: boolean;
  onRequireAuth: (action: { type: 'register'; event: Event }, prompt: string) => void;
}): React.ReactElement {
  const [day, month] = (() => {
    try {
      const d = new Date(event.date + 'T00:00:00');
      return [d.getDate().toString(), d.toLocaleString('default', { month: 'short' })];
    } catch { return [event.date.slice(8,10), event.date.slice(5,7)]; }
  })();

  const organizer = event.entryRequirements ? 'Members only' : 'Campus Events';
  const initials = organizer.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <article
      className="event-card"
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${event.title}`}
    >
      {/* Banner */}
      <div className="event-card-image" aria-hidden="true">
        <div className="event-card-image-bg" style={{ background: getBannerGradient(event.subtype) }} />
        <span className={`event-card-price-badge ${event.price ? 'paid' : 'free'}`}>
          {event.price ? `$${event.price}` : 'Free'}
        </span>
        <div className="event-card-date-chip">
          <span className="event-card-date-day">{day}</span>
          <span className="event-card-date-month">{month}</span>
        </div>
      </div>

      {/* Body */}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-desc">{event.description}</p>
        <div className="event-card-organizer">
          <div className="event-card-organizer-avatar" aria-hidden="true">{initials}</div>
          <span className="event-card-organizer-name">{organizer}</span>
        </div>
        <div className="event-card-meta">
          <span className="event-card-meta-item">🕐 {event.time}</span>
          <span className="event-card-meta-item">📍 {event.locationName}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="event-card-footer">
        <button
          className="btn btn-primary btn-sm"
          onClick={e => {
            e.stopPropagation();
            if (!isAuthenticated) {
              onRequireAuth({ type: 'register', event }, `Sign in to register for "${event.title}"`);
            } else {
              onClick();
            }
          }}
          aria-label={isAuthenticated ? `Register for ${event.title}` : `Sign in to register for ${event.title}`}
        >
          {isAuthenticated ? 'Register' : '🔒 Register'}
        </button>
        {event.entryRequirements && (
          <span className="event-card-req" title={event.entryRequirements}>🔒 Restricted</span>
        )}
      </div>
    </article>
  );
}

export function EventCardSkeleton(): React.ReactElement {
  return (
    <div className="event-card-skeleton" aria-hidden="true">
      <div className="event-card-skeleton-image skeleton" />
      <div className="event-card-skeleton-body">
        <div className="event-card-skeleton-line skeleton" style={{ height: 14, width: '40%' }} />
        <div className="event-card-skeleton-line skeleton" style={{ height: 18, width: '85%', marginTop: 4 }} />
        <div className="event-card-skeleton-line skeleton" style={{ height: 13, width: '70%', marginTop: 4 }} />
        <div className="event-card-skeleton-line skeleton" style={{ height: 13, width: '55%', marginTop: 4 }} />
      </div>
      <div className="event-card-skeleton-footer">
        <div className="skeleton" style={{ height: 32, width: 90, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function SessionCard({ session, onClick }: { session: SessionPost; onClick: () => void }): React.ReactElement {
  const sportEmojis: Record<string, string> = {
    basketball: '🏀', football: '🏈', soccer: '⚽', tennis: '🎾',
    volleyball: '🏐', badminton: '🏸', cricket: '🏏', rugby: '🏉',
    frisbee: '🥏', swimming: '🏊', running: '🏃', cycling: '🚴',
  };
  const emoji = sportEmojis[session.sport.toLowerCase()] ?? '🏅';

  return (
    <article
      className="session-card"
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${session.sport} session`}
    >
      <div className="session-card-sport">
        <div className="session-card-sport-icon" aria-hidden="true">{emoji}</div>
        {session.sport}
      </div>
      <div className="session-card-meta">
        <span className="session-card-badge slots">
          👥 {session.participantsNeeded} spot{session.participantsNeeded !== 1 ? 's' : ''} needed
        </span>
        {session.skillLevel && <span className="session-card-badge">{session.skillLevel}</span>}
      </div>
      <p className="session-card-desc">📅 {session.scheduledAt.replace('T', ' ').slice(0, 16)}</p>
      <p className="session-card-desc">{session.description}</p>
    </article>
  );
}
