import React, { useState, useEffect, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface ReminderPrefs {
  enabled: boolean;
  inApp: boolean;
  email: boolean;
  remind24h: boolean;
  remind1h: boolean;
  remindNow: boolean;
}

interface SentEmail {
  to: string;
  subject: string;
  body: string;
  html?: string;
  sentAt: string;
}

interface Props {
  authToken: string;
  onBack: () => void;
}

// ── Toggle switch ─────────────────────────────────────────────────────────

function Toggle({
  id, label, description, checked, onChange, disabled,
}: {
  id: string; label: string; description?: string;
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}): React.ReactElement {
  return (
    <label className="pref-toggle-row" htmlFor={id}>
      <div className="pref-toggle-info">
        <span className="pref-toggle-label">{label}</span>
        {description && <span className="pref-toggle-desc">{description}</span>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`pref-toggle${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        aria-label={label}
      >
        <span className="pref-toggle-thumb" />
      </button>
    </label>
  );
}

// ── Email preview modal ───────────────────────────────────────────────────

function EmailPreviewModal({ email, onClose }: { email: SentEmail; onClose: () => void }): React.ReactElement {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', animation: 'fadeIn 0.18s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Email preview"
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 640, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'slideUp 0.22s ease',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{email.subject}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              To: {email.to} &nbsp;·&nbsp; {new Date(email.sentAt).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.1rem', color: 'var(--text-muted)',
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Tab: HTML / Plain */}
        {email.html
          ? (
            <iframe
              title="Email HTML preview"
              srcDoc={email.html}
              style={{ flex: 1, border: 'none', minHeight: 420 }}
              sandbox="allow-same-origin"
            />
          )
          : (
            <pre style={{
              flex: 1, padding: '1.25rem', margin: 0,
              fontFamily: 'var(--font)', fontSize: '0.85rem',
              color: 'var(--text)', overflowY: 'auto',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
            }}>
              {email.body}
            </pre>
          )
        }
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function ReminderPrefsPage({ authToken, onBack }: Props): React.ReactElement {
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<SentEmail | null>(null);
  const [showEmails, setShowEmails] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // ── Load prefs ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/reminder-prefs`, { headers })
      .then(r => r.json())
      .then((data: ReminderPrefs) => setPrefs(data))
      .catch(() => setError('Failed to load preferences'));
  }, [authToken]);

  // ── Save a partial update ─────────────────────────────────────────────

  async function update(patch: Partial<ReminderPrefs>): Promise<void> {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`${API}/reminder-prefs`, {
        method: 'PUT', headers, body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  // ── Test send ─────────────────────────────────────────────────────────

  async function handleTestSend(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch(`${API}/reminder-prefs/test-send`, { method: 'POST', headers });
      const json = await res.json() as { ok?: boolean; sent?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Test failed');
      const channels = json.sent ?? [];
      setTestResult(
        channels.length === 0
          ? '⚠️ No channels active — enable In-App or Email reminders below.'
          : `✅ Test sent via: ${channels.join(', ')}. Check your notification bell!`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test send failed');
    } finally {
      setTesting(false);
    }
  }

  // ── Load sent emails ──────────────────────────────────────────────────

  const loadSentEmails = useCallback(async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch(`${API}/reminder-prefs/sent-emails`, { headers });
      if (res.ok) {
        const data = await res.json() as SentEmail[];
        setSentEmails(data.slice().reverse()); // newest first
      }
    } catch { /* silent */ } finally {
      setLoadingEmails(false);
    }
  }, [authToken]);

  function toggleEmailLog(): void {
    const next = !showEmails;
    setShowEmails(next);
    if (next) void loadSentEmails();
  }

  // ── Render: loading / error ───────────────────────────────────────────

  if (!prefs) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <button className="detail-back" onClick={onBack}>← Back</button>
          {error
            ? <div className="alert alert-error">{error}</div>
            : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
          }
        </div>
      </div>
    );
  }

  const disabled = !prefs.enabled;

  // ── Render: main ─────────────────────────────────────────────────────

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <button className="detail-back" onClick={onBack}>← Back</button>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <h1 className="form-title" style={{ margin: 0 }}>🔔 Reminder Preferences</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saving…</span>}
            {saved  && <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✅ Saved</span>}
          </div>
        </div>
        <p className="form-subtitle">Control when and how you receive event reminders.</p>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {testResult && (
          <div style={{
            background: testResult.startsWith('✅') ? '#dcfce7' : '#fef3c7',
            border: `1px solid ${testResult.startsWith('✅') ? '#86efac' : '#fcd34d'}`,
            color: testResult.startsWith('✅') ? '#166534' : '#92400e',
            borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
            fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5,
          }}>
            {testResult}
          </div>
        )}

        {/* ── Master toggle ── */}
        <div className="pref-section">
          <Toggle
            id="pref-enabled"
            label="Enable reminders"
            description="Turn all event reminders on or off"
            checked={prefs.enabled}
            onChange={v => { void update({ enabled: v }); }}
          />
        </div>

        {/* ── Delivery channels ── */}
        <div className="pref-section">
          <div className="pref-section-title">Delivery channels</div>
          <Toggle
            id="pref-inapp"
            label="In-app notifications"
            description="Show reminders in the notification bell"
            checked={prefs.inApp}
            onChange={v => { void update({ inApp: v }); }}
            disabled={disabled}
          />
          <Toggle
            id="pref-email"
            label="Email notifications"
            description="Send reminder emails to your campus address"
            checked={prefs.email}
            onChange={v => { void update({ email: v }); }}
            disabled={disabled}
          />
        </div>

        {/* ── Reminder timing ── */}
        <div className="pref-section">
          <div className="pref-section-title">Reminder timing</div>
          <Toggle
            id="pref-24h"
            label="24 hours before"
            description="Get a heads-up the day before the event"
            checked={prefs.remind24h}
            onChange={v => { void update({ remind24h: v }); }}
            disabled={disabled}
          />
          <Toggle
            id="pref-1h"
            label="1 hour before"
            description="A reminder to get ready and head over"
            checked={prefs.remind1h}
            onChange={v => { void update({ remind1h: v }); }}
            disabled={disabled}
          />
          <Toggle
            id="pref-now"
            label="When event starts"
            description="Notified the moment the event begins"
            checked={prefs.remindNow}
            onChange={v => { void update({ remindNow: v }); }}
            disabled={disabled}
          />
        </div>

        {/* ── Test send ── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.2rem' }}>Send a test reminder</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Fires an immediate test via your enabled channels to verify everything's working.
            </div>
          </div>
          <button
            id="btn-test-send"
            className="btn btn-outline btn-sm"
            onClick={() => { void handleTestSend(); }}
            disabled={testing || !prefs.enabled}
            style={{ flexShrink: 0 }}
          >
            {testing ? '⏳ Sending…' : '🚀 Test Send'}
          </button>
        </div>

        {/* ── Sent-email log ── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
          marginBottom: '1.5rem',
        }}>
          <button
            id="btn-toggle-email-log"
            onClick={toggleEmailLog}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.9rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)',
            }}
          >
            <span>📬 Simulated Email Log</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {showEmails ? '▲ Hide' : '▼ Show'}
            </span>
          </button>

          {showEmails && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{ padding: '0.55rem 1.1rem', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  All reminder emails sent in this session (simulated — not real emails)
                </span>
                <button
                  className="notif-action-btn"
                  onClick={() => { void loadSentEmails(); }}
                  aria-label="Refresh email log"
                >
                  ↻ Refresh
                </button>
              </div>

              {loadingEmails && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading…
                </div>
              )}

              {!loadingEmails && sentEmails.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  📭 No emails sent yet. Try the "Test Send" button above!
                </div>
              )}

              {!loadingEmails && sentEmails.map((em, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1.1rem', borderBottom: i < sentEmails.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    📧
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {em.subject}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      To: {em.to} &nbsp;·&nbsp; {new Date(em.sentAt).toLocaleString()}
                    </div>
                  </div>
                  {em.html && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPreviewEmail(em)}
                      style={{ flexShrink: 0, fontSize: '0.75rem' }}
                    >
                      Preview
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Reminders are sent for events you've registered for. The scheduler checks every 60 seconds.
          Changes take effect on the next check cycle.
        </p>
      </div>

      {/* ── Email preview modal ── */}
      {previewEmail && (
        <EmailPreviewModal
          email={previewEmail}
          onClose={() => setPreviewEmail(null)}
        />
      )}
    </div>
  );
}
