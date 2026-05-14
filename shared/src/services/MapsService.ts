/**
 * Handles Google Maps navigation integration.
 * Requirements: 4.2, 4.4, 4.5, 4.6
 */
export interface MapsService {
  /**
   * Opens Google Maps with the given address as the destination.
   * Tries the native URI scheme first (iOS/Android), falls back to the web URL.
   * Throws if both the native scheme and web URL are unavailable.
   * Requirements: 4.4, 4.5, 4.6
   */
  openDirections(address: string): Promise<void>;
}
