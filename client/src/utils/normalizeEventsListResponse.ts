import type { Event } from '@campus-event-finder/shared';

/**
 * GET /events returns a paginated envelope `{ events, total, ... }`.
 * Older code paths may still expect a raw `Event[]`. Accept both.
 */
export function normalizeEventsListResponse(body: unknown): Event[] {
  if (Array.isArray(body)) return body as Event[];
  if (body !== null && typeof body === 'object' && 'events' in body) {
    const list = (body as { events: unknown }).events;
    if (Array.isArray(list)) return list as Event[];
  }
  return [];
}
