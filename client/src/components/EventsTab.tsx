import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@campus-event-finder/shared';
import { normalizeEventsListResponse } from '../utils/normalizeEventsListResponse';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface EventsTabProps {
  onSelectEvent: (event: Event) => void;
}

/**
 * Renders the event list, search input, and navigates to event detail.
 * Fetches events from GET /events and GET /events?q={query}.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4
 */
export function EventsTab({ onSelectEvent }: EventsTabProps): React.ReactElement {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (query: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const url = query.trim()
        ? `${API_BASE_URL}/events?q=${encodeURIComponent(query.trim())}`
        : `${API_BASE_URL}/events`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
      }
      const data = await response.json();
      setEvents(normalizeEventsListResponse(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load full event list on mount (requirement 1.2)
  useEffect(() => {
    void fetchEvents('');
  }, [fetchEvents]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const query = e.target.value;
    setSearchValue(query);
    void fetchEvents(query);
  }

  function handleSearchClear(): void {
    setSearchValue('');
    void fetchEvents('');
  }

  // Events from the API are already ordered by date ascending (requirement 1.1),
  // but sort client-side as a safety measure.
  const sortedEvents = [...events].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    return dateCmp !== 0 ? dateCmp : a.time.localeCompare(b.time);
  });

  function renderEmptyState(): React.ReactElement {
    if (searchValue.trim()) {
      // Requirement 2.3: no matching events found
      return <p role="status">No matching events found.</p>;
    }
    // Requirement 1.3: no events currently scheduled
    return <p role="status">No events currently scheduled.</p>;
  }

  return (
    <div>
      {/* Requirement 2.1: search input field */}
      <div>
        <input
          type="text"
          placeholder="Search events..."
          value={searchValue}
          onChange={handleSearchChange}
          aria-label="Search events"
        />
        {searchValue && (
          <button onClick={handleSearchClear} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>

      {isLoading && <p role="status">Loading events...</p>}

      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && (
        sortedEvents.length === 0
          ? renderEmptyState()
          : (
            <ul>
              {sortedEvents.map((event) => (
                <li
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectEvent(event);
                    }
                  }}
                  aria-label={`View details for ${event.title}`}
                >
                  {/* Requirement 1.4: title, date, time, location name */}
                  <strong>{event.title}</strong>
                  <span> — {event.date}</span>
                  <span> {event.time}</span>
                  <span> @ {event.locationName}</span>
                  {/* Requirement 1.4: price if set */}
                  {event.price !== undefined && event.price !== null && (
                    <span> · ${event.price}</span>
                  )}
                  {/* Requirement 1.5: entry requirements summary if set */}
                  {event.entryRequirements && (
                    <span> · Requirements: {event.entryRequirements}</span>
                  )}
                </li>
              ))}
            </ul>
          )
      )}
    </div>
  );
}
