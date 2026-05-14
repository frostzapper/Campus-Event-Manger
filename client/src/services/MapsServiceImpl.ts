import type { MapsService } from '@campus-event-finder/shared';

const GOOGLE_MAPS_WEB_URL = 'https://maps.google.com';

/**
 * Builds the Google Maps web URL for a given address.
 * Requirements: 4.5
 */
export function buildMapsWebUrl(address: string): string {
  return `${GOOGLE_MAPS_WEB_URL}?q=${encodeURIComponent(address)}`;
}

/**
 * Builds the Google Maps iOS URI scheme URL.
 * Requirements: 4.6
 */
export function buildIosUri(address: string): string {
  return `comgooglemaps://?daddr=${encodeURIComponent(address)}&directionsmode=driving`;
}

/**
 * Builds the Google Maps Android intent URL.
 * Requirements: 4.6
 */
export function buildAndroidUri(address: string): string {
  return `google.navigation:q=${encodeURIComponent(address)}`;
}

/**
 * Detects whether the current platform is iOS.
 */
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Detects whether the current platform is Android.
 */
function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Attempts to open a native URI scheme on mobile.
 * Sets window.location.href to the native URI, then waits `timeoutMs`.
 * If the page is still visible after the timeout (native app didn't open),
 * falls back to opening the web URL in a new tab.
 */
function tryNativeUriWithFallback(nativeUri: string, webUrl: string, timeoutMs = 500): void {
  window.location.href = nativeUri;

  setTimeout(() => {
    // If the document is still visible the native app did not open — fall back.
    if (!document.hidden) {
      window.open(webUrl, '_blank');
    }
  }, timeoutMs);
}

/**
 * Client-side implementation of MapsService.
 * Tries native URI scheme first, falls back to web URL.
 * Requirements: 4.2, 4.4, 4.5, 4.6
 */
export class MapsServiceImpl implements MapsService {
  async openDirections(address: string): Promise<void> {
    const webUrl = buildMapsWebUrl(address);

    if (isIos()) {
      // Requirements: 4.6 — try iOS URI scheme, fall back to web URL (4.5)
      const iosUri = buildIosUri(address);
      tryNativeUriWithFallback(iosUri, webUrl);
    } else if (isAndroid()) {
      // Requirements: 4.6 — try Android intent URL, fall back to web URL (4.5)
      const androidUri = buildAndroidUri(address);
      tryNativeUriWithFallback(androidUri, webUrl);
    } else {
      // Requirements: 4.5 — desktop/web: open web URL directly
      window.open(webUrl, '_blank');
    }
  }
}
