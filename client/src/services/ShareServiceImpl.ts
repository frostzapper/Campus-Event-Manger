import type { Event, ShareService } from '@campus-event-finder/shared';

/**
 * Composes the share content for an event.
 * Requirements: 9.3, 9.4
 */
export function composeShareContent(event: Event): { title: string; text: string; url?: string } {
  const text = [
    event.title,
    `Date: ${event.date} at ${event.time}`,
    `Location: ${event.locationName}`,
    event.description,
  ].join('\n');

  return {
    title: event.title,
    text,
    ...(event.deepLinkUrl ? { url: event.deepLinkUrl } : {}),
  };
}

/**
 * Client-side implementation of ShareService using the Web Share API.
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export class ShareServiceImpl implements ShareService {
  async shareEvent(event: Event): Promise<void> {
    if (!navigator.share) {
      throw new Error('Sharing is not supported on this device');
    }
    const content = composeShareContent(event);
    await navigator.share(content);
  }
}
