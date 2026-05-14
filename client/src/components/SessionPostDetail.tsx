import React, { useState } from 'react';
import type { SessionPost, Student } from '@campus-event-finder/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface SessionPostDetailProps {
  post: SessionPost;
  currentStudent: Student | null;
  authToken: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function SessionPostDetail({ post, currentStudent, authToken, onEdit, onDelete }: SessionPostDetailProps): React.ReactElement {
  const isOwner = currentStudent !== null && currentStudent.id === post.creatorId;
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to delete post (${res.status})`);
      onDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article aria-label={`Play session: ${post.sport}`}>
      <h1 className="detail-title">⚽ {post.sport}</h1>

      <div className="detail-info-grid" style={{ marginTop: '1rem' }}>
        <div className="detail-info-card">
          <div className="detail-info-label">Participants Needed</div>
          <div className="detail-info-value">👥 {post.participantsNeeded}</div>
        </div>
        <div className="detail-info-card">
          <div className="detail-info-label">Skill Level</div>
          <div className="detail-info-value">{post.skillLevel || 'Any'}</div>
        </div>
        <div className="detail-info-card">
          <div className="detail-info-label">Scheduled</div>
          <div className="detail-info-value" style={{ fontSize: '0.9rem' }}>
            {post.scheduledAt.replace('T', ' ').slice(0, 16)}
          </div>
        </div>
      </div>

      <p className="detail-body" style={{ marginTop: '1rem' }}>{post.description}</p>

      {deleteError && <div className="alert alert-error" role="alert">{deleteError}</div>}

      {isOwner && (
        <div className="detail-actions">
          <button className="btn btn-outline" onClick={onEdit} aria-label="Edit post">✏️ Edit</button>
          <button
            className="btn"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' }}
            onClick={() => { void handleDelete(); }}
            disabled={isDeleting}
            aria-label="Delete post"
          >
            {isDeleting ? 'Deleting…' : '🗑️ Delete'}
          </button>
        </div>
      )}
    </article>
  );
}
