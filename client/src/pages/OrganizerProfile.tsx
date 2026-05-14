import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@campus-event-finder/shared';
import { EventCard, EventCardSkeleton } from './HomePage';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface OrganizerData {
  id: string;
  displayName: string;
  email: string;
  followerCount: number;
  followingCount: number;
  eventCount: number;
  events: Event[];
}

interface OrganizerProfileProps {
  organizerId: string;
  authToken?: string;
  currentStudentId?: string;
  onBack: () => void;
  onSelectEvent: (event: Event) => void;
  onRequireAuth: () => void;
}

export function OrganizerProfile({
  organizerId, authToken, currentStudentId,
  onBack, onSelectEvent, onRequireAuth,
}: OrganizerProfileProps): React.ReactElement {
  const [organizer, setOrganizer] = useState<OrganizerData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentStudentId === organizerId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/follows/profile/${organizerId}`);
      if (!res.ok) throw new Error('Profile not found');
      const data = await res.json() as OrganizerData;
      setOrganizer(data);
      setFollowerCount(data.followerCount);

      // Check follow status if authenticated
      if (authToken && !isOwnProfile) {
        const statusRes = await fetch(`${API}/follows/profile/${organizerId}/follow-status`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (statusRes.ok) {
          const { following } = await statusRes.json() as { following: boolean };
          setIsFollowing(following);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [organizerId, authToken, isOwnProfile]);

  useEffect(() => { void load(); }, [load]);

  async function handleFollow(): Promise<void> {
    if (!authToken) { onRequireAuth(); return; }
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/follows/${organizerId}`, {
        method,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json() as { following: boolean; followerCount: number };
        setIsFollowing(data.following);
        setFollowerCount(data.followerCount);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <button className="detail-back" onClick={onBack}>← Back</button>
          <div className="org-profile-header skeleton" style={{ height: 160, borderRadius: 'var(--radius)', marginBottom: '2rem' }} />
          <div className="cards-grid cards-grid-3">
            {[1,2,3].map(i => <EventCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !organizer) {
    return (
      <div className="section">
        <div className="container">
          <button className="detail-back" onClick={onBack}>← Back</button>
          <div className="state-empty">
            <div className="state-empty-icon">😕</div>
            <p>{error ?? 'Profile not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const initials = organizer.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const upcoming = organizer.events.filter(e => new Date(e.date) >= new Date(new Date().toDateString()));
  const past = organizer.events.filter(e => new Date(e.date) < new Date(new Date().toDateString()));

  return (
    <div className="section">
      <div className="container">
        <button className="detail-back" onClick={onBack}>← Back</button>

        {/* Profile header */}
        <div className="org-profile-card">
          <div className="org-avatar-lg" aria-hidden="true">{initials}</div>
          <div className="org-profile-info">
            <h1 className="org-profile-name">{organizer.displayName}</h1>
            <p className="org-profile-email">{organizer.email}</p>
            <div className="org-profile-stats">
              <div className="org-stat">
                <span className="org-stat-num">{followerCount}</span>
                <span className="org-stat-lbl">Followers</span>
              </div>
              <div className="org-stat">
                <span className="org-stat-num">{organizer.followingCount}</span>
                <span className="org-stat-lbl">Following</span>
              </div>
              <div className="org-stat">
                <span className="org-stat-num">{organizer.eventCount}</span>
                <span className="org-stat-lbl">Events</span>
              </div>
            </div>
          </div>
          {!isOwnProfile && (
            <button
              className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => { void handleFollow(); }}
              disabled={followLoading}
              aria-label={isFollowing ? `Unfollow ${organizer.displayName}` : `Follow ${organizer.displayName}`}
            >
              {followLoading ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
            </button>
          )}
        </div>

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
              🟢 Upcoming <span>Events</span>
            </h2>
            <div className="cards-grid cards-grid-3">
              {upcoming.map(e => (
                <EventCard
                  key={e.id} event={e}
                  onClick={() => onSelectEvent(e)}
                  isAuthenticated={!!authToken}
                  onRequireAuth={() => onRequireAuth()}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
              ⏹ Past <span>Events</span>
            </h2>
            <div className="cards-grid cards-grid-3" style={{ opacity: 0.7 }}>
              {past.map(e => (
                <EventCard
                  key={e.id} event={e}
                  onClick={() => onSelectEvent(e)}
                  isAuthenticated={!!authToken}
                  onRequireAuth={() => onRequireAuth()}
                />
              ))}
            </div>
          </div>
        )}

        {organizer.events.length === 0 && (
          <div className="state-empty" style={{ marginTop: '2rem' }}>
            <div className="state-empty-icon">📭</div>
            <p>No published events yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
