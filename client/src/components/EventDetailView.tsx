import React from 'react';
import type { Event } from '@campus-event-finder/shared';

interface EventDetailViewProps {
  event: Event;
  isOnCampus: boolean | null;
  isAuthenticated: boolean;
  onGetDirections: (address: string) => void;
  onShare: (event: Event) => void;
  onRegister: (event: Event) => void;
  /** Only provided when the current user is the creator */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Navigate to organizer profile */
  onViewOrganizer?: (organizerId: string) => void;
}

export function EventDetailView({
  event, isOnCampus, isAuthenticated,
  onGetDirections, onShare, onRegister,
  onEdit, onDelete, onViewOrganizer,
}: EventDetailViewProps): React.ReactElement {
  const showDirections = isOnCampus === false || isOnCampus === null;
  const isCreator = !!onEdit;

  return (
    <article aria-label={`Event details: ${event.title}`}>
      {/* Banner */}
      {event.bannerImage && (
        <div style={{ height: 220, borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <img src={event.bannerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <h1 className="detail-title">{event.title}</h1>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {event.tags.map(tag => (
            <span key={tag} className="event-card-category" style={{ fontSize: '0.7rem' }}>#{tag}</span>
          ))}
        </div>
      )}

      <div className="detail-meta">
        <span className="detail-meta-item">📅 {event.date}</span>
        <span className="detail-meta-item">🕐 {event.time}</span>
        <span className="detail-meta-item">📍 {event.locationName}</span>
      </div>

      <div className="detail-info-grid" style={{ marginTop: '1.5rem' }}>
        <div className="detail-info-card">
          <div className="detail-info-label">Location</div>
          <div className="detail-info-value" style={{ fontSize: '0.9rem' }}>{event.campusAddress}</div>
        </div>
        <div className="detail-info-card">
          <div className="detail-info-label">Price</div>
          <div className="detail-info-value" style={{ color: event.price ? 'var(--warning)' : 'var(--success)' }}>
            {event.price ? `$${event.price}` : 'Free'}
          </div>
        </div>
        {event.maxParticipants && (
          <div className="detail-info-card">
            <div className="detail-info-label">Capacity</div>
            <div className="detail-info-value">👥 {event.participantCount ?? 0} / {event.maxParticipants}</div>
          </div>
        )}
        {event.registrationDeadline && (
          <div className="detail-info-card">
            <div className="detail-info-label">Register by</div>
            <div className="detail-info-value" style={{ fontSize: '0.85rem' }}>
              {event.registrationDeadline.replace('T', ' ').slice(0, 16)}
            </div>
          </div>
        )}
        {event.entryRequirements && (
          <div className="detail-info-card" style={{ gridColumn: '1 / -1' }}>
            <div className="detail-info-label">🔒 Entry Requirements</div>
            <div className="detail-info-value" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
              {event.entryRequirements}
            </div>
          </div>
        )}
      </div>

      <p className="detail-body" style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>

      {/* Organizer row */}
      {event.creatorId && onViewOrganizer && (
        <div className="org-row" style={{ marginBottom: '1.25rem' }}>
          <button
            className="org-row-btn"
            onClick={() => onViewOrganizer(event.creatorId!)}
            aria-label="View organizer profile"
          >
            <div className="event-card-organizer-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }} aria-hidden="true">
              {(event.creatorId ?? 'O').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>View Organizer Profile</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>→</span>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="detail-actions">
        <button
          className={`btn ${event.isRegistered ? 'btn-success' : 'btn-primary'}`}
          onClick={() => onRegister(event)}
          disabled={event.isRegistered || (event.maxParticipants ? (event.participantCount ?? 0) >= event.maxParticipants : false)}
          aria-label={
            event.isRegistered 
              ? `Already registered for ${event.title}` 
              : isAuthenticated ? `Register for ${event.title}` : `Sign in to register for ${event.title}`
          }
        >
          {event.isRegistered 
            ? '✅ Already Registered' 
            : (event.maxParticipants && (event.participantCount ?? 0) >= event.maxParticipants)
              ? '🚫 Event Full'
              : isAuthenticated ? 'Register Now' : '🔒 Register'}
        </button>

        <button className="btn btn-outline" onClick={() => onShare(event)} aria-label="Share event">
          📤 Share
        </button>

        {showDirections && (
          <button className="btn btn-outline" onClick={() => onGetDirections(event.campusAddress)} aria-label="Get Directions">
            🗺️ Directions
          </button>
        )}

        {/* Creator controls */}
        {isCreator && (
          <>
            <button className="btn btn-outline" onClick={onEdit} aria-label="Edit event">✏️ Edit</button>
            <button
              className="btn"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' }}
              onClick={onDelete}
              aria-label="Delete event"
            >
              🗑️ Delete
            </button>
          </>
        )}
      </div>

      {!isAuthenticated && (
        <p style={{
          marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)',
          background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
          padding: '0.6rem 0.75rem',
        }}>
          🔒 Sign in to register for events, follow organisers, and more.
        </p>
      )}
    </article>
  );
}
