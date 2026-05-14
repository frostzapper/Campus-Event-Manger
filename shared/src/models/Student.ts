/**
 * Represents a registered student user of the application.
 * Requirements: 10.1, 10.2
 */
export interface Student {
  id: string;
  /** Campus email credentials */
  email: string;
  displayName: string;
  passwordHash: string;
}
