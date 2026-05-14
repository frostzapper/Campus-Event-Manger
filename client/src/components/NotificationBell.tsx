import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

// ── Types ─────────────────────────────────────────────────────────────────
type NotificationType =
  | 'new_event' | 'registration' | 'event_soon'
  | 'event_updated' | 'event_cancelled' | 'new_follower';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string;
  actorId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  authToken: string;
  onSelectEvent?: (eventId: string) => void;
  onSelectProfile?: (userId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const TYPE_ICON: Record<NotificationType, string> = {
  new_event:       '🎉',
  registration:    '✅',
  event_soon:      '⏰',
  event_updated:   '📝',
  event_cancelled: '❌',
  new_follower:    '👤',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  new_event:       '#6c63ff',
  registration:    '#22c55e',
  event_soon:      '#f59e0b',
  event_updated:   '#3b82f6',
  event_cancelled: '#ef4444',
  new_follower:    '#f472b6',
};

const TYPE_GROUP: Record<NotificationType, string> = {
  new_event:       'Events',
  registration:    'Registrations',
  event_soon:      'Reminders',
  event_updated:   'Updates',
  event_cancelled: 'Updates',
  new_follower:    'Social',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Toast component ──────────────────────────────────────────────────────
function NotifToast({ notif, onDismiss, onOpen }: {
  notif: Notification;
  onDismiss: () => void;
  onOpen: () => void;
}): React.ReactElement {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '0.9rem 1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxWidth: 320, animation: 'toastIn 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={onOpen}
      role="alert"
      aria-live="polite"
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: TYPE_COLOR[notif.type],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}
      >
        {TYPE_ICON[notif.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.15rem', lineHeight: 1.3 }}>
          {notif.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {notif.body}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.85rem',
          padding: '0.1rem', lineHeight: 1, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export function NotificationBell({ authToken, onSelectEvent, onSelectProfile }: NotificationBellProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const prevUnreadRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headers = { Authorization: `Bearer ${authToken}` };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API}/notifications/unread-count`, { headers });
      if (res.ok) {
        const { count } = await res.json() as { count: number };
        // Show a toast if new notifications arrived while dropdown is closed
        if (count > prevUnreadRef.current && !open) {
          // Fetch the newest to show in toast
          const r2 = await fetch(`${API}/notifications`, { headers });
          if (r2.ok) {
            const all = await r2.json() as Notification[];
            const newest = all.find(n => !n.read);
            if (newest) setToast(newest);
          }
        }
        prevUnreadRef.current = count;
        setUnread(count);
      }
    } catch { /* silent */ }
  }, [authToken, open]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications`, { headers });
      if (res.ok) {
        const data = await res.json() as Notification[];
        setNotifications(data);
        setUnread(data.filter(n => !n.read).length);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Poll unread count every 15s for near-real-time feel
  useEffect(() => {
    void fetchCount();
    const id = setInterval(() => { void fetchCount(); }, 15_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent): void { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleOpen(): void {
    const next = !open;
    setOpen(next);
    if (next) void fetchAll();
  }

  // ── Actions ────────────────────────────────────────────────────────────
  async function markRead(id: string): Promise<void> {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  }

  async function markAllRead(): Promise<void> {
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers });
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function clearAll(): Promise<void> {
    await fetch(`${API}/notifications`, { method: 'DELETE', headers });
    setNotifications([]);
    setUnread(0);
  }

  function handleNotifClick(n: Notification): void {
    if (!n.read) void markRead(n.id);
    if (n.eventId && onSelectEvent) { onSelectEvent(n.eventId); setOpen(false); }
    else if (n.actorId && onSelectProfile) { onSelectProfile(n.actorId); setOpen(false); }
  }

  // ── Group notifications ────────────────────────────────────────────────
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const g = TYPE_GROUP[n.type] ?? 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(n);
    return acc;
  }, {});

  const groupOrder = ['Registrations', 'Reminders', 'Events', 'Updates', 'Social'];
  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => (groupOrder.indexOf(a) ?? 99) - (groupOrder.indexOf(b) ?? 99)
  );

  return (
    <>
    {toast && (
      <NotifToast
        notif={toast}
        onDismiss={() => setToast(null)}
        onOpen={() => {
          setToast(null);
          setOpen(true);
          void fetchAll();
        }}
      />
    )}
    <div className="notif-wrap" ref={dropdownRef}>
      {/* Bell button */}
      <button
        className="notif-bell-btn"
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="notif-bell-icon" aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="notif-badge-count" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown" role="dialog" aria-label="Notifications">
          {/* Header */}
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">
              Notifications
              {unread > 0 && <span className="notif-unread-pill">{unread} new</span>}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {unread > 0 && (
                <button className="notif-action-btn" onClick={() => { void markAllRead(); }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn notif-action-clear" onClick={() => { void clearAll(); }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="notif-dropdown-body">
            {loading && (
              <div className="notif-empty">
                <div className="notif-empty-icon">⏳</div>
                <p>Loading…</p>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <p>You're all caught up!</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Notifications will appear here.
                </p>
              </div>
            )}

            {!loading && sortedGroups.map(group => (
              <div key={group} className="notif-group">
                <div className="notif-group-label">{group}</div>
                {grouped[group].map(n => (
                  <button
                    key={n.id}
                    className={`notif-item${n.read ? '' : ' unread'}`}
                    onClick={() => handleNotifClick(n)}
                    aria-label={`${n.title}: ${n.body}${n.read ? '' : ' (unread)'}`}
                  >
                    <div
                      className="notif-item-icon"
                      style={{ background: TYPE_COLOR[n.type] }}
                      aria-hidden="true"
                    >
                      {TYPE_ICON[n.type]}
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-body">{n.body}</div>
                      <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.read && <div className="notif-unread-dot" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
