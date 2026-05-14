import React, { useState, useRef, useCallback } from 'react';
import type { Event } from '@campus-event-finder/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';


// ── Types ─────────────────────────────────────────────────────────────────
interface EventDraft {
  title: string;
  description: string;
  subtype: 'sports' | 'technical' | 'cultural' | 'other';
  isOnline: boolean;
  date: string;
  time: string;
  locationName: string;
  campusAddress: string;
  isFree: boolean;
  price: string;
  entryRequirements: string;
  tags: string;
  maxParticipants: string;
  registrationDeadline: string;
  bannerImage: string; // base64 data URL
}

type FormErrors = Partial<Record<keyof EventDraft, string>>;

interface CreateEventPageProps {
  authToken: string;
  existingEvent?: Event;
  onSuccess: (event: Event) => void;
  onCancel: () => void;
}

const DRAFT_KEY = 'campus_event_draft';

function emptyDraft(): EventDraft {
  return {
    title: '', description: '', subtype: 'other', isOnline: false, date: '', time: '',
    locationName: '', campusAddress: '', isFree: true, price: '',
    entryRequirements: '', tags: '', maxParticipants: '', registrationDeadline: '',
    bannerImage: '',
  };
}

function eventToDraft(e: Event): EventDraft {
  return {
    title: e.title,
    description: e.description,
    subtype: e.subtype ?? 'other',
    isOnline: !!e.isOnline,
    date: e.date,
    time: e.time,
    locationName: e.locationName,
    campusAddress: e.campusAddress,
    isFree: !e.price,
    price: e.price ? String(e.price) : '',
    entryRequirements: e.entryRequirements ?? '',
    tags: (e.tags ?? []).join(', '),
    maxParticipants: e.maxParticipants ? String(e.maxParticipants) : '',
    registrationDeadline: e.registrationDeadline ?? '',
    bannerImage: e.bannerImage ?? '',
  };
}

// ── Validation ────────────────────────────────────────────────────────────
function validate(d: EventDraft): FormErrors {
  const e: FormErrors = {};
  if (!d.title.trim()) e.title = 'Title is required';
  else if (d.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
  if (!d.date) e.date = 'Date is required';
  else if (new Date(d.date) < new Date(new Date().toDateString())) e.date = 'Date must be today or in the future';
  if (!d.time) e.time = 'Time is required';
  if (!d.locationName.trim()) e.locationName = 'Venue name is required';
  if (!d.campusAddress.trim()) e.campusAddress = 'Campus address is required';
  if (!d.isFree) {
    const p = parseFloat(d.price);
    if (!d.price || isNaN(p) || p <= 0) e.price = 'Enter a valid price greater than 0';
  }
  if (d.maxParticipants) {
    const n = parseInt(d.maxParticipants, 10);
    if (isNaN(n) || n < 1) e.maxParticipants = 'Must be a positive number';
  }
  return e;
}

// ── Simple rich-text toolbar ──────────────────────────────────────────────
function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }): React.ReactElement {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string): void {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  const tools = [
    { label: 'B', title: 'Bold', action: () => wrap('**', '**') },
    { label: 'I', title: 'Italic', action: () => wrap('_', '_') },
    { label: 'H2', title: 'Heading', action: () => wrap('\n## ', '\n') },
    { label: '• List', title: 'Bullet list', action: () => wrap('\n- ', '') },
    { label: '🔗', title: 'Link', action: () => wrap('[', '](url)') },
  ];

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar" role="toolbar" aria-label="Text formatting">
        {tools.map(t => (
          <button key={t.label} type="button" className="rte-btn" title={t.title} onClick={t.action}>
            {t.label}
          </button>
        ))}
        <span className="rte-hint">Markdown supported</span>
      </div>
      <textarea
        ref={ref}
        className="form-textarea rte-area"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe your event… (Markdown supported)"
        rows={8}
        aria-label="Event description"
      />
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────
function EventPreview({ draft }: { draft: EventDraft }): React.ReactElement {
  const gradient = 'linear-gradient(135deg,#6c63ff 0%,#a78bfa 50%,#f472b6 100%)';
  return (
    <div className="event-preview">
      <div className="event-preview-banner" style={{ background: draft.bannerImage ? `url(${draft.bannerImage}) center/cover` : gradient }}>
        <span className={`event-card-price-badge ${draft.isFree ? 'free' : 'paid'}`}>
          {draft.isFree ? 'Free' : `$${draft.price}`}
        </span>
      </div>
      <div className="event-preview-body">
        <h2 className="event-preview-title">{draft.title || 'Event Title'}</h2>
        <div className="event-card-meta" style={{ marginBottom: '0.75rem' }}>
          {draft.date && <span className="event-card-meta-item">📅 {draft.date}</span>}
          {draft.time && <span className="event-card-meta-item">🕐 {draft.time}</span>}
          {draft.locationName && <span className="event-card-meta-item">📍 {draft.locationName}</span>}
        </div>
        {draft.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {draft.description.slice(0, 300)}{draft.description.length > 300 ? '…' : ''}
          </p>
        )}
        {draft.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
            {draft.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className="event-card-category" style={{ fontSize: '0.7rem' }}>#{tag}</span>
            ))}
          </div>
        )}
        {draft.maxParticipants && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            👥 Max {draft.maxParticipants} participants
          </p>
        )}
        {draft.registrationDeadline && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            ⏰ Register by {draft.registrationDeadline}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────
export function CreateEventPage({ authToken, existingEvent, onSuccess, onCancel }: CreateEventPageProps): React.ReactElement {
  const isEdit = !!existingEvent;

  const [draft, setDraft] = useState<EventDraft>(() => {
    if (existingEvent) return eventToDraft(existingEvent);
    // Restore saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved) as EventDraft;
    } catch { /* ignore */ }
    return emptyDraft();
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]): void {
    setDraft(d => ({ ...d, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  // ── Draft save ──────────────────────────────────────────────────────────
  function saveDraft(): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch { /* ignore */ }
  }

  function clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }

  // ── Image upload ────────────────────────────────────────────────────────
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(er => ({ ...er, bannerImage: 'Image must be under 2 MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => set('bannerImage', ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(status: 'published' | 'draft'): Promise<void> {
    if (status === 'published') {
      const errs = validate(draft);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: Partial<Event> = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      date: draft.date,
      time: draft.time,
      locationName: draft.locationName.trim(),
      campusAddress: draft.campusAddress.trim(),
      price: draft.isFree ? undefined : parseFloat(draft.price),
      entryRequirements: draft.entryRequirements.trim() || undefined,
      tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean),
      maxParticipants: draft.maxParticipants ? parseInt(draft.maxParticipants, 10) : undefined,
      registrationDeadline: draft.registrationDeadline || undefined,
      bannerImage: draft.bannerImage || undefined,
      subtype: draft.subtype,
      isOnline: draft.isOnline,
      status,
    };

    try {
      const url = isEdit ? `${API_BASE_URL}/events/${existingEvent!.id}` : `${API_BASE_URL}/events`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        setSubmitError(data.message ?? `Failed to save event (${res.status})`);
        return;
      }
      const saved = await res.json() as Event;
      clearDraft();
      onSuccess(saved);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="create-event-page">
      {/* Header */}
      <div className="create-event-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <button className="detail-back" onClick={onCancel}>← Cancel</button>
              <h1 className="form-title" style={{ marginTop: '0.25rem' }}>
                {isEdit ? '✏️ Edit Event' : '🎉 Create New Event'}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPreview(v => !v)}>
                {showPreview ? '📝 Edit' : '👁️ Preview'}
              </button>
              {!isEdit && (
                <button type="button" className="btn btn-outline btn-sm" onClick={saveDraft} disabled={isSubmitting}>
                  {draftSaved ? '✅ Saved!' : '💾 Save Draft'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="create-event-layout">
          {/* ── Form ── */}
          <div className={`create-event-form${showPreview ? ' hidden-mobile' : ''}`}>
            {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

            {/* Banner image */}
            <div className="cev-section">
              <h2 className="cev-section-title">Banner Image</h2>
              <div
                className="cev-image-drop"
                style={draft.bannerImage ? { backgroundImage: `url(${draft.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                tabIndex={0}
                role="button"
                aria-label="Upload banner image"
              >
                {!draft.bannerImage && (
                  <div className="cev-image-placeholder">
                    <span style={{ fontSize: '2rem' }}>🖼️</span>
                    <p>Click to upload banner image</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG up to 2 MB</p>
                  </div>
                )}
                {draft.bannerImage && (
                  <button
                    type="button"
                    className="cev-image-remove"
                    onClick={e => { e.stopPropagation(); set('bannerImage', ''); }}
                    aria-label="Remove image"
                  >✕</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              {errors.bannerImage && <div className="form-error">{errors.bannerImage}</div>}
            </div>

            {/* Basic info */}
            <div className="cev-section">
              <h2 className="cev-section-title">Basic Information</h2>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-title">Event Title *</label>
                <input id="ev-title" className={`form-input${errors.title ? ' input-error' : ''}`} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Annual Hackathon 2026" />
                {errors.title && <div className="form-error">{errors.title}</div>}
              </div>


              <div className="form-group">
                <label className="form-label">Discovery Classification *</label>
                <div className="filter-chips">
                  {(['technical', 'cultural', 'sports', 'other'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`filter-chip ${draft.subtype === s ? 'active' : ''}`}
                      onClick={() => set('subtype', s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <RichTextEditor value={draft.description} onChange={v => set('description', v)} />
                {errors.description && <div className="form-error">{errors.description}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-tags">Tags <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(comma-separated)</span></label>
                <input id="ev-tags" className="form-input" value={draft.tags} onChange={e => set('tags', e.target.value)} placeholder="hackathon, coding, prizes" />
              </div>
            </div>

            {/* Date & time */}
            <div className="cev-section">
              <h2 className="cev-section-title">Date & Time</h2>
              <div className="cev-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="ev-date">Date *</label>
                  <input id="ev-date" className={`form-input${errors.date ? ' input-error' : ''}`} type="date" value={draft.date} onChange={e => set('date', e.target.value)} />
                  {errors.date && <div className="form-error">{errors.date}</div>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="ev-time">Time *</label>
                  <input id="ev-time" className={`form-input${errors.time ? ' input-error' : ''}`} type="time" value={draft.time} onChange={e => set('time', e.target.value)} />
                  {errors.time && <div className="form-error">{errors.time}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ev-deadline">Registration Deadline</label>
                <input id="ev-deadline" className="form-input" type="datetime-local" value={draft.registrationDeadline} onChange={e => set('registrationDeadline', e.target.value)} />
              </div>
            </div>

            {/* Venue */}
            <div className="cev-section">
              <h2 className="cev-section-title">Venue</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="ev-venue">Venue Name *</label>
                <input id="ev-venue" className={`form-input${errors.locationName ? ' input-error' : ''}`} value={draft.locationName} onChange={e => set('locationName', e.target.value)} placeholder="e.g. Engineering Building, Room 101" />
                {errors.locationName && <div className="form-error">{errors.locationName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ev-address">Campus Address *</label>
                <input id="ev-address" className={`form-input${errors.campusAddress ? ' input-error' : ''}`} value={draft.campusAddress} onChange={e => set('campusAddress', e.target.value)} placeholder="e.g. 10 Engineering Dr, Room 101" />
                {errors.campusAddress && <div className="form-error">{errors.campusAddress}</div>}
              </div>

              <div className="cev-toggle-row">
                <span className="form-label" style={{ margin: 0 }}>Event Format</span>
                <div className="cev-toggle">
                  <button
                    type="button"
                    className={`cev-toggle-btn${!draft.isOnline ? ' active' : ''}`}
                    onClick={() => set('isOnline', false)}
                  >In-person</button>
                  <button
                    type="button"
                    className={`cev-toggle-btn${draft.isOnline ? ' active' : ''}`}
                    onClick={() => set('isOnline', true)}
                  >Online</button>
                </div>
              </div>
            </div>

            {/* Tickets & capacity */}
            <div className="cev-section">
              <h2 className="cev-section-title">Tickets & Capacity</h2>

              {/* Free / Paid toggle */}
              <div className="cev-toggle-row">
                <span className="form-label" style={{ margin: 0 }}>Ticket type</span>
                <div className="cev-toggle">
                  <button
                    type="button"
                    className={`cev-toggle-btn${draft.isFree ? ' active' : ''}`}
                    onClick={() => set('isFree', true)}
                  >Free</button>
                  <button
                    type="button"
                    className={`cev-toggle-btn${!draft.isFree ? ' active' : ''}`}
                    onClick={() => set('isFree', false)}
                  >Paid</button>
                </div>
              </div>

              {!draft.isFree && (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label" htmlFor="ev-price">Price ($) *</label>
                  <input id="ev-price" className={`form-input${errors.price ? ' input-error' : ''}`} type="number" min="0.01" step="0.01" value={draft.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 5.00" />
                  {errors.price && <div className="form-error">{errors.price}</div>}
                </div>
              )}

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label" htmlFor="ev-max">Max Participants <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave blank for unlimited)</span></label>
                <input id="ev-max" className={`form-input${errors.maxParticipants ? ' input-error' : ''}`} type="number" min="1" value={draft.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} placeholder="e.g. 100" />
                {errors.maxParticipants && <div className="form-error">{errors.maxParticipants}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-req">Entry Requirements <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="ev-req" className="form-input" value={draft.entryRequirements} onChange={e => set('entryRequirements', e.target.value)} placeholder="e.g. Open to CS students only" />
              </div>
            </div>

            {/* Actions */}
            <div className="cev-actions">
              <button type="button" className="btn btn-primary" onClick={() => { void handleSubmit('published'); }} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Saving…' : isEdit ? '✅ Save Changes' : '🚀 Publish Event'}
              </button>
              {!isEdit && (
                <button type="button" className="btn btn-outline" onClick={() => { void handleSubmit('draft'); }} disabled={isSubmitting}>
                  💾 Save as Draft
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
            </div>
          </div>

          {/* ── Preview panel ── */}
          <div className={`create-event-preview-panel${showPreview ? ' visible' : ''}`}>
            <h2 className="cev-section-title" style={{ marginBottom: '1rem' }}>👁️ Preview</h2>
            <EventPreview draft={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}
