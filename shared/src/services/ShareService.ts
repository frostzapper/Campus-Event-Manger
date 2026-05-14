import type { Event } from '../models/Event';

/**
 * Invokes the device's native share sheet with composed event content.
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export interface ShareService {
  /**
   * Composes share content from the event and invokes the native share sheet.
   * Share content includes: title, date, time, locationName, plain-text summary,
   * and deepLinkUrl if set on the event.
   * Throws if the native share sheet is unavailable.
   * Requirements: 9.3, 9.4
   */
  shareEvent(event: Event): Promise<void>;
}
