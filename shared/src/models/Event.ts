/**
 * Represents a campus event with scheduling and location information.
 * Requirements: 1.4, 3.1
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 date string, e.g. "2024-09-15" */
  date: string;
  /** Local time in HH:MM format, e.g. "14:30" */
  time: string;
  locationName: string;
  campusAddress: string;
  /** Undefined or null means the event is free */
  price?: number;
  entryRequirements?: string;
  deepLinkUrl?: string;

  // ── Extended fields for event creation ──
  /** Student id of the creator */
  creatorId?: string;
  /** Tags for filtering, e.g. ["hackathon", "coding"] */
  tags?: string[];
  /** Maximum number of participants (undefined = unlimited) */
  maxParticipants?: number;
  /** ISO 8601 datetime for registration deadline */
  registrationDeadline?: string;
  /** Base64 data URL or remote URL for the banner image */
  bannerImage?: string;
  /** 'published' | 'draft' */
  status?: 'published' | 'draft';
  /** Whether the event is online/virtual */
  isOnline?: boolean;
  /** Primary classification for discovery */
  subtype?: 'sports' | 'technical' | 'cultural' | 'other';
  /** Total number of confirmed participants */
  participantCount?: number;
  /** Whether the current student is registered (only populated if authenticated) */
  isRegistered?: boolean;
}
