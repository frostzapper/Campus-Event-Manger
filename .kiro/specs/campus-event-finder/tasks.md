  # Implementation Plan: Campus Event Finder

## Overview

Implement the Campus Event Finder app incrementally: data models and API layer first, then the Events tab (browse, search, detail, directions, share), then the Sports tab (browse, search, create/edit/delete session posts), and finally authentication wiring.

## Tasks

- [x] 1. Set up project structure, data models, and core interfaces
  - Create directory structure for client components, services, and API
  - Define TypeScript interfaces: `Event`, `SessionPost`, `Student`, `AuthSession`
  - Define service interfaces: `LocationService`, `MapsService`, `ShareService`, `AuthService`
  - Set up testing framework (Jest + fast-check for property-based tests)
  - _Requirements: 1.4, 3.1, 5.3, 7.2_

- [x] 2. Implement REST API — Events endpoints
  - [x] 2.1 Implement `GET /events` — return upcoming events ordered by date ascending
    - Filter out events with dates before current date
    - Order results by date ascending
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Write property test for event list ordering and filtering (Property 1)
    - **Property 1: Event list ordering and filtering**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.3 Implement `GET /events?q={query}` — keyword search across title, description, category
    - _Requirements: 2.2_

  - [x] 2.4 Write property test for event search correctness (Property 3)
    - **Property 3: Event search correctness**
    - **Validates: Requirements 2.2**

  - [x] 2.5 Implement `GET /events/:id` — return single event detail
    - _Requirements: 3.1_

- [x] 3. Implement REST API — Sessions endpoints
  - [x] 3.1 Implement `GET /sessions` — return active session posts with open slots
    - Filter to `isActive === true` and `participantsNeeded >= 1`
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Write property test for session post list filtering (Property 9)
    - **Property 9: Session post list shows only active posts with open slots**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 3.3 Implement `GET /sessions?q={query}` — keyword search across sport name and description
    - _Requirements: 6.2_

  - [x] 3.4 Write property test for session post search correctness (Property 11)
    - **Property 11: Session post search correctness**
    - **Validates: Requirements 6.2**

  - [x] 3.5 Implement `POST /sessions` — create session post (auth required)
    - Validate required fields: sport, participantsNeeded (>= 1), scheduledAt, description
    - Associate post with authenticated student's id
    - Return 401 for unauthenticated requests
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 10.1_

  - [x] 3.6 Write property test for session post validation (Property 13)
    - **Property 13: Session post validation rejects incomplete submissions**
    - **Validates: Requirements 7.2, 7.4**

  - [x] 3.7 Write property test for session post creation round-trip (Property 14)
    - **Property 14: Session post creation round-trip**
    - **Validates: Requirements 7.3, 7.5**

  - [x] 3.8 Write property test for unauthenticated request rejection (Property 20)
    - **Property 20: Unauthenticated requests to session management are rejected**
    - **Validates: Requirements 10.1**

  - [x] 3.9 Implement `PUT /sessions/:id` — edit session post (auth required, owner only)
    - _Requirements: 8.2, 10.1_

  - [x] 3.10 Implement `DELETE /sessions/:id` — delete session post (auth required, owner only)
    - Set `isActive = false` or remove record; post must no longer appear in list
    - _Requirements: 8.3, 10.1_

- [x] 4. Implement authentication API
  - [x] 4.1 Implement `POST /auth/login` — validate credentials, return JWT
    - Return error on invalid credentials; do not grant access
    - _Requirements: 10.2, 10.3_

  - [x] 4.2 Implement `POST /auth/refresh` — refresh expiring session token
    - _Requirements: 10.4_

  - [x] 4.3 Implement JWT middleware for protected routes
    - Attach to `POST /sessions`, `PUT /sessions/:id`, `DELETE /sessions/:id`
    - Return 401 for missing or invalid tokens
    - _Requirements: 10.1_

- [x] 5. Checkpoint — Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement LocationService
  - [x] 6.1 Implement `getCurrentLocation()` using device Geolocation API
    - _Requirements: 4.1_

  - [x] 6.2 Implement `isOnCampus(coords)` using campus boundary GeoJSON polygon
    - Load campus boundary polygon from configuration
    - _Requirements: 4.1_

  - [x] 6.3 Write property test for campus boundary detection (Property 8)
    - **Property 8: Campus boundary detection**
    - **Validates: Requirements 4.1**

- [x] 7. Implement MapsService
  - [x] 7.1 Implement `openDirections(address)` — try native URI scheme, fall back to web URL
    - iOS: `comgooglemaps://` URI scheme; Android: intent URL; fallback: `https://maps.google.com`
    - _Requirements: 4.2, 4.4, 4.5, 4.6_

  - [x] 7.2 Write property test for maps navigation address correctness (Property 7)
    - **Property 7: Maps navigation uses correct address**
    - **Validates: Requirements 3.5, 4.4**

  - [x] 7.3 Write unit test for MapsService web URL fallback
    - Verify fallback to web URL when native URI scheme fails
    - _Requirements: 4.5_

- [x] 8. Implement ShareService
  - [x] 8.1 Implement `shareEvent(event)` — compose share content and invoke native share sheet
    - Include title, date, time, locationName, plain-text summary; include deepLinkUrl if set
    - Display error message if share sheet is unavailable
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Write property test for share content composition completeness (Property 19)
    - **Property 19: Share content composition completeness**
    - **Validates: Requirements 9.3, 9.4**

- [x] 9. Implement EventsTab and EventDetailView
  - [x] 9.1 Implement `EventsTab` component
    - Render event list ordered by date; show title, date, time, location, price (if set), entry requirements summary (if set)
    - Show empty-state message when no upcoming events
    - Wire search input to `GET /events?q=` and clear to restore full list
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4_

  - [x] 9.2 Write property test for event list item rendering completeness (Property 2)
    - **Property 2: Event list item rendering completeness**
    - **Validates: Requirements 1.4, 1.5**

  - [x] 9.3 Write property test for search clear restores full list (Property 4)
    - **Property 4: Search clear restores full list**
    - **Validates: Requirements 2.4**

  - [x] 9.4 Implement `EventDetailView` component
    - Render title, full description, date, time, locationName, campusAddress
    - Show price if set; show full entry requirements if set
    - Show share button; wire to `ShareService.shareEvent()`
    - Show "Get Directions" button based on location context; wire to `MapsService.openDirections()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.7, 9.1_

  - [x] 9.5 Write property test for event detail view rendering completeness (Property 5)
    - **Property 5: Event detail view rendering completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 9.6 Write property test for directions button visibility (Property 6)
    - **Property 6: Directions button visibility based on location context**
    - **Validates: Requirements 3.4, 4.3, 4.7**

- [x] 10. Checkpoint — Ensure all Events tab tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement SportsTab and SessionPostDetail
  - [x] 11.1 Implement `SportsTab` component
    - Render active session post list; show sport, participantsNeeded, skillLevel, scheduledAt, description
    - Show empty-state message when no active posts with open slots
    - Wire search input to `GET /sessions?q=` and clear to restore full list
    - Show "Create Post" button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.3, 6.4, 7.1_

  - [x] 11.2 Write property test for session post rendering completeness (Property 10)
    - **Property 10: Session post rendering completeness**
    - **Validates: Requirements 5.3**

  - [x] 11.3 Write property test for session post search clear restores full list (Property 12)
    - **Property 12: Session post search clear restores full list**
    - **Validates: Requirements 6.4**

  - [x] 11.4 Implement `SessionPostDetail` component
    - Display session post fields
    - Show edit/delete options only when `currentStudent.id === post.creatorId`
    - _Requirements: 8.1_

  - [x] 11.5 Write property test for edit/delete visibility (Property 15)
    - **Property 15: Edit/delete options visible only to post owner**
    - **Validates: Requirements 8.1**

- [x] 12. Implement SessionPostForm (create and edit)
  - [x] 12.1 Implement `SessionPostForm` component for creating a new session post
    - Fields: sport, participantsNeeded, skillLevel, scheduledAt, description
    - Validate all required fields on submit; show per-field errors without publishing
    - On success, publish post and navigate back to SportsTab
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 12.2 Extend `SessionPostForm` to support editing an existing post
    - Pre-populate all fields with existing post data when opened in edit mode
    - On save, call `PUT /sessions/:id` and reflect changes in SportsTab
    - _Requirements: 8.2, 8.4_

  - [x] 12.3 Write property test for edit form pre-population (Property 18)
    - **Property 18: Edit form pre-population**
    - **Validates: Requirements 8.4**

  - [x] 12.4 Wire delete action in `SessionPostDetail` to `DELETE /sessions/:id`
    - Remove post from SportsTab list after deletion
    - _Requirements: 8.3_

  - [x] 12.5 Write property test for session post edit round-trip (Property 16)
    - **Property 16: Session post edit round-trip**
    - **Validates: Requirements 8.2**

  - [x] 12.6 Write property test for session post deletion removes from list (Property 17)
    - **Property 17: Session post deletion removes from list**
    - **Validates: Requirements 8.3**

- [x] 13. Implement AuthService and wire authentication
  - [x] 13.1 Implement `AuthService` — login, token storage, session expiry detection
    - Call `POST /auth/login`; store JWT; detect expiry and prompt re-auth
    - Show authentication error on invalid credentials
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 13.2 Gate session post create/edit/delete actions behind authentication check
    - Redirect unauthenticated students to login before these actions
    - _Requirements: 10.1_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations; tag each test with `// Feature: campus-event-finder, Property {N}: {property_text}`
- Unit tests cover empty states, error conditions, and edge cases per the Testing Strategy in the design
