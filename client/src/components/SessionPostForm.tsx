import React, { useState } from 'react';
import type { SessionPost } from '@campus-event-finder/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface SessionPostFormProps {
  existingPost?: SessionPost;
  onSuccess: () => void;
  onCancel: () => void;
  authToken: string;
}

export function SessionPostForm({ existingPost, onSuccess, onCancel, authToken }: SessionPostFormProps): React.ReactElement {
  const [sport, setSport] = useState(existingPost?.sport ?? '');
  const [participantsNeeded, setParticipantsNeeded] = useState(existingPost?.participantsNeeded?.toString() ?? '');
  const [skillLevel, setSkillLevel] = useState(existingPost?.skillLevel ?? '');
  const [scheduledAt, setScheduledAt] = useState(existingPost?.scheduledAt ?? '');
  const [description, setDescription] = useState(existingPost?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!sport.trim()) e.sport = 'Sport name is required';
    const p = parseInt(participantsNeeded, 10);
    if (!participantsNeeded.trim() || isNaN(p) || p < 1) e.participantsNeeded = 'At least 1 participant is required';
    if (!scheduledAt.trim()) e.scheduledAt = 'Scheduled date and time is required';
    if (!description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      sport: sport.trim(),
      participantsNeeded: parseInt(participantsNeeded, 10),
      skillLevel: skillLevel.trim(),
      scheduledAt: scheduledAt.trim(),
      description: description.trim(),
    };
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const url = existingPost ? `${API_BASE_URL}/sessions/${existingPost.id}` : `${API_BASE_URL}/sessions`;
      const res = await fetch(url, {
        method: existingPost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSubmitError(res.status === 401 ? 'You must be logged in to perform this action.' : `Failed to save session post (${res.status})`);
        return;
      }
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save session post');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={e => { void handleSubmit(e); }} noValidate>
      {submitError && <div className="form-submit-error" role="alert">{submitError}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="sport">Sport</label>
        <input id="sport" className="form-input" value={sport} onChange={e => setSport(e.target.value)} placeholder="e.g. Basketball, Tennis…" />
        {errors.sport && <div className="form-error" role="alert">{errors.sport}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="participantsNeeded">Participants needed</label>
        <input id="participantsNeeded" className="form-input" type="number" min={1} value={participantsNeeded} onChange={e => setParticipantsNeeded(e.target.value)} placeholder="e.g. 3" />
        {errors.participantsNeeded && <div className="form-error" role="alert">{errors.participantsNeeded}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="skillLevel">Skill level <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input id="skillLevel" className="form-input" value={skillLevel} onChange={e => setSkillLevel(e.target.value)} placeholder="e.g. Beginner, Intermediate, Any" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="scheduledAt">Scheduled date and time</label>
        <input id="scheduledAt" className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        {errors.scheduledAt && <div className="form-error" role="alert">{errors.scheduledAt}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">Description</label>
        <textarea id="description" className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what to expect…" />
        {errors.description && <div className="form-error" role="alert">{errors.description}</div>}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : existingPost ? 'Save Changes' : 'Post Session'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  );
}
