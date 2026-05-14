/**
 * Represents a student-created post advertising a one-time sports play session.
 * Requirements: 5.3, 7.2
 */
export interface SessionPost {
  id: string;
  /** References Student.id */
  creatorId: string;
  sport: string;
  /** Must be >= 1 */
  participantsNeeded: number;
  skillLevel: string;
  /** ISO 8601 datetime string */
  scheduledAt: string;
  description: string;
  /** false when deleted or session is full */
  isActive: boolean;
  /** ISO 8601 datetime string */
  createdAt: string;
}
