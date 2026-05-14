import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@campus-event-finder/shared';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

// ── Types ─────────────────────────────────────────────────────────────────
interface Analytics {
  registrations: number;
  capacity: number | null;
  fillRate: number | null;
  isUpcoming: boolean;
  status: 'published' | 'draft';
}
interface CreatedEvent extends Event { analytics: Analytics; }
interface Participant { id: string; displayName: string; email: string; }

type DashTab = 'joined' | 'created' | 'saved';

interface Props {
  authToken: string;
  studentId: string;
  onSelectEvent: (event: Event) => void;
  onEditEvent: (event: Event) => void;
  onCreateEvent: () => void;
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }): React.ReactElement {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-icon" style={{ background: color }} aria-hidden="true">{icon}</div>
      <div>
        <div className="dash-stat-value">{value}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────
function FillBar({ pct, color = 'var(--primary)' }: { pct: number; color?: string }): React.ReactElement {
  return (
    <div className="dash-fill-bar-wrap" aria-label={`${pct}% full`}>
      <div className="dash-fill-bar-track">
        <div className="dash-fill-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="dash-fill-bar-pct">{pct}%</span>
    </div>
  );
}

// ── Participants modal ────────────────────────────────────────────────────
function ParticipantsModal({ eventId, eventTitle, authToken, onClose }: {
  eventId: string; eventTitle: string; authToken: string; onClose: () => void;
}): React.ReactElement {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard/created/${eventId}/participants`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then((data: Participant[]) => setParticipants(data))
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));
  }, [eventId, authToken]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Participants">
      <div className="auth-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>👥 Participants</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{eventTitle}</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
        ) : participants.length === 0 ? (
          <div className="state-empty"><div className="state-empty-icon">👤</div><p>No registrations yet.</p></div>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {participants.map((p, i) => (
              <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {p.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{i + 1}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Created event card ────────────────────────────────────────────────────
function CreatedEventCard({ event, authToken, onEdit, onDelete, onView }: {
  event: CreatedEvent;
  authToken: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}): React.ReactElement {
  const [showParticipants, setShowParticipants] = useState(false);
  const { analytics } = event;
  const fillColor = analytics.fillRate !== null
    ? analytics.fillRate >= 90 ? '#ef4444' : analytics.fillRate >= 60 ? '#f59e0b' : 'var(--success)'
    : 'var(--primary)';

  return (
    <>
      <div className="dash-created-card">
        {/* Status badge */}
        <div className="dash-created-card-header">
          <span className={`dash-status-badge ${analytics.status === 'draft' ? 'draft' : analytics.isUpcoming ? 'upcoming' : 'past'}`}>
            {analytics.status === 'draft' ? '📝 Draft' : analytics.isUpcoming ? '🟢 Upcoming' : '⏹ Past'}
          </span>
        </div>

        <h3 className="dash-created-card-title" onClick={onView} style={{ cursor: 'pointer' }}>{event.title}</h3>

        <div className="event-card-meta" style={{ marginBottom: '0.75rem' }}>
          <span className="event-card-meta-item">📅 {event.date}</span>
          <span className="event-card-meta-item">🕐 {event.time}</span>
          <span className="event-card-meta-item">📍 {event.locationName}</span>
        </div>

        {/* Analytics row */}
        <div className="dash-analytics-row">
          <div className="dash-analytics-item">
            <span className="dash-analytics-num">{analytics.registrations}</span>
            <span className="dash-analytics-lbl">Registered</span>
          </div>
          <div className="dash-analytics-item">
            <span className="dash-analytics-num">{analytics.capacity ?? '∞'}</span>
            <span className="dash-analytics-lbl">Capacity</span>
          </div>
          <div className="dash-analytics-item">
            <span className="dash-analytics-num" style={{ color: fillColor }}>
              {analytics.fillRate !== null ? `${analytics.fillRate}%` : '—'}
            </span>
            <span className="dash-analytics-lbl">Fill rate</span>
          </div>
        </div>

        {/* Fill bar */}
        {analytics.fillRate !== null && (
          <FillBar pct={analytics.fillRate} color={fillColor} />
        )}

        {/* Actions */}
        <div className="dash-created-card-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowParticipants(true)}>
            👥 Participants ({analytics.registrations})
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit</button>
          <button
            className="btn btn-sm"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' }}
            onClick={onDelete}
          >
            🗑️
          </button>
        </div>
      </div>

      {showParticipants && (
        <ParticipantsModal
          eventId={event.id}
          eventTitle={event.title}
          authToken={authToken}
          onClose={() => setShowParticipants(false)}
        />
      )}
    </>
  );
}

// ── Simple event card (joined / saved) ────────────────────────────────────
function SimpleEventCard({ event, badge, badgeColor, onView, onAction, actionLabel, actionColor }: {
  event: Event;
  badge?: string;
  badgeColor?: string;
  onView: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionColor?: string;
}): React.ReactElement {
  const isUpcoming = new Date(event.date) >= new Date(new Date().toDateString());
  return (
    <div className="dash-simple-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span className={`dash-status-badge ${isUpcoming ? 'upcoming' : 'past'}`}>
            {isUpcoming ? '🟢 Upcoming' : '⏹ Past'}
          </span>
        </div>
        {badge && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: badgeColor ?? 'var(--primary)', background: 'var(--primary-light)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)' }}>{badge}</span>}
      </div>
      <h3 className="dash-created-card-title" onClick={onView} style={{ cursor: 'pointer', marginBottom: '0.4rem' }}>{event.title}</h3>
      <div className="event-card-meta" style={{ marginBottom: '0.75rem' }}>
        <span className="event-card-meta-item">📅 {event.date}</span>
        <span className="event-card-meta-item">🕐 {event.time}</span>
        <span className="event-card-meta-item">📍 {event.locationName}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={onView}>View Details</button>
        {onAction && actionLabel && (
          <button
            className="btn btn-sm"
            style={{ background: actionColor ? '#fef2f2' : 'var(--primary-light)', color: actionColor ?? 'var(--primary)', border: `1.5px solid ${actionColor ? '#fecaca' : 'var(--primary)'}` }}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────
export function MyEventsDashboard({ authToken, studentId, onSelectEvent, onEditEvent, onCreateEvent }: Props): React.ReactElement {
  const [tab, setTab] = useState<DashTab>('joined');
  const [joined, setJoined] = useState<Event[]>([]);
  const [created, setCreated] = useState<CreatedEvent[]>([]);
  const [saved, setSaved] = useState<Event[]>([]);
  const [summary, setSummary] = useState({ joinedCount: 0, createdCount: 0, savedCount: 0 });
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${authToken}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, joinRes, creRes, savRes] = await Promise.all([
        fetch(`${API}/dashboard`, { headers }),
        fetch(`${API}/dashboard/joined`, { headers }),
        fetch(`${API}/dashboard/created`, { headers }),
        fetch(`${API}/dashboard/saved`, { headers }),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (joinRes.ok) setJoined(await joinRes.json());
      if (creRes.ok) setCreated(await creRes.json());
      if (savRes.ok) setSaved(await savRes.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { void load(); }, [load]);

  async function handleLeave(eventId: string): Promise<void> {
    await fetch(`${API}/dashboard/join/${eventId}`, { method: 'DELETE', headers });
    setJoined(j => j.filter(e => e.id !== eventId));
    setSummary(s => ({ ...s, joinedCount: s.joinedCount - 1 }));
  }

  async function handleUnsave(eventId: string): Promise<void> {
    await fetch(`${API}/dashboard/save/${eventId}`, { method: 'DELETE', headers });
    setSaved(s => s.filter(e => e.id !== eventId));
    setSummary(s => ({ ...s, savedCount: s.savedCount - 1 }));
  }

  async function handleDeleteCreated(eventId: string): Promise<void> {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    await fetch(`${API}/events/${eventId}`, { method: 'DELETE', headers });
    setCreated(c => c.filter(e => e.id !== eventId));
    setSummary(s => ({ ...s, createdCount: s.createdCount - 1 }));
  }

  const tabs: Array<{ id: DashTab; label: string; count: number }> = [
    { id: 'joined', label: '🎟️ Events I Joined', count: summary.joinedCount },
    { id: 'created', label: '🎉 Events I Created', count: summary.createdCount },
    { id: 'saved', label: '🔖 Saved Events', count: summary.savedCount },
  ];

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="section-title">My Events <span>Dashboard</span></h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Manage your events, registrations, and saved items.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onCreateEvent}>+ Create Event</button>
        </div>

        {/* Summary stats */}
        <div className="dash-stats-row">
          <StatCard icon="🎟️" label="Events Joined" value={summary.joinedCount} color="linear-gradient(135deg,#6c63ff,#a78bfa)" />
          <StatCard icon="🎉" label="Events Created" value={summary.createdCount} color="linear-gradient(135deg,#f093fb,#f5576c)" />
          <StatCard icon="🔖" label="Saved Events" value={summary.savedCount} color="linear-gradient(135deg,#43e97b,#38f9d7)" />
        </div>

        {/* Tabs */}
        <div className="dash-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`dash-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="dash-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="cards-grid cards-grid-3">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : (
          <>
            {/* Joined */}
            {tab === 'joined' && (
              joined.length === 0
                ? <EmptyState icon="🎟️" message="You haven't joined any events yet." action="Browse Events" onAction={() => window.location.reload()} />
                : <div className="cards-grid cards-grid-3">
                    {joined.map(e => (
                      <SimpleEventCard
                        key={e.id} event={e}
                        badge="Registered" badgeColor="var(--success)"
                        onView={() => onSelectEvent(e)}
                        onAction={() => { void handleLeave(e.id); }}
                        actionLabel="Leave" actionColor="#dc2626"
                      />
                    ))}
                  </div>
            )}

            {/* Created */}
            {tab === 'created' && (
              created.length === 0
                ? <EmptyState icon="🎉" message="You haven't created any events yet." action="Create your first event" onAction={onCreateEvent} />
                : <div className="cards-grid cards-grid-3">
                    {created.map(e => (
                      <CreatedEventCard
                        key={e.id} event={e} authToken={authToken}
                        onView={() => onSelectEvent(e)}
                        onEdit={() => onEditEvent(e)}
                        onDelete={() => { void handleDeleteCreated(e.id); }}
                      />
                    ))}
                  </div>
            )}

            {/* Saved */}
            {tab === 'saved' && (
              saved.length === 0
                ? <EmptyState icon="🔖" message="No saved events yet. Bookmark events to find them here." action="Browse Events" onAction={() => window.location.reload()} />
                : <div className="cards-grid cards-grid-3">
                    {saved.map(e => (
                      <SimpleEventCard
                        key={e.id} event={e}
                        badge="Saved" badgeColor="var(--warning)"
                        onView={() => onSelectEvent(e)}
                        onAction={() => { void handleUnsave(e.id); }}
                        actionLabel="Remove" actionColor="#dc2626"
                      />
                    ))}
                  </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, message, action, onAction }: { icon: string; message: string; action: string; onAction: () => void }): React.ReactElement {
  return (
    <div className="state-empty">
      <div className="state-empty-icon">{icon}</div>
      <p>{message}</p>
      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={onAction}>{action}</button>
    </div>
  );
}
