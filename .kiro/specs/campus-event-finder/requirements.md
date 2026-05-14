# Requirements Document

## Introduction

The Campus Event Finder is a mobile/web application that helps students discover events happening on campus, get directions to event locations via Google Maps, and connect with other students through a sports session matching feature. The app has two primary tabs: an Events tab for browsing and searching campus events, and a Sports tab for finding or joining one-time play sessions for a sport that need additional participants.

## Glossary

- **App**: The Campus Event Finder application
- **Student**: A registered user of the App who is enrolled at the campus
- **Event**: A scheduled campus activity with a title, description, location, date, time, and optional price and entry requirements
- **Event_Organizer**: A Student or staff member who creates and manages Events
- **Play_Session**: A one-time, informal sports activity posted by a Student seeking additional participants for a single session
- **Session_Post**: A listing created by a Student advertising a Play_Session that needs participants
- **Entry_Requirement**: An optional condition a participant must meet to attend an Event (e.g., membership in a specific club)
- **Location_Context**: The determined state of whether the Student is currently on campus or off campus
- **Search_Service**: The component responsible for filtering Events and Session_Posts by keyword or criteria
- **Maps_Service**: The Google Maps integration component that provides directions and location display
- **Events_Tab**: The primary view displaying campus Events
- **Sports_Tab**: The secondary view displaying Session_Posts
- **Share_Sheet**: The operating system's native sharing interface that presents available apps and services a Student can share content to

---

 ## Requirements

### Requirement 1: Browse Campus Events

**User Story:** As a student, I want to browse upcoming campus events, so that I can stay informed about what is happening on campus.

#### Acceptance Criteria

1. THE App SHALL display a list of upcoming Events on the Events_Tab, ordered by date ascending.
2. WHEN a Student opens the Events_Tab, THE App SHALL load and display Events scheduled from the current date onward.
3. WHEN no upcoming Events exist, THE App SHALL display a message indicating no events are currently scheduled.
4. THE App SHALL display each Event with its title, date, time, location name, and price if a price has been set.
5. WHERE an Event has Entry_Requirements defined, THE App SHALL display a summary of those requirements alongside the Event in the list.

---

### Requirement 2: Search for Events

**User Story:** As a student, I want to search for events by keyword or category, so that I can quickly find events relevant to my interests.

#### Acceptance Criteria

1. THE Events_Tab SHALL provide a search input field that accepts keyword queries.
2. WHEN a Student submits a search query, THE Search_Service SHALL return Events whose title, description, or category contains the query string.
3. WHEN a search query returns no results, THE App SHALL display a message indicating no matching events were found.
4. WHEN a Student clears the search input, THE App SHALL restore the full list of upcoming Events.

---

### Requirement 3: View Event Details

**User Story:** As a student, I want to view detailed information about an event, so that I know exactly where and when to show up.

#### Acceptance Criteria

1. WHEN a Student selects an Event from the list, THE App SHALL display a detail view containing the Event's title, full description, date, time, location name, and campus address.
2. WHERE an Event has a price set, THE Event detail view SHALL display the entry fee amount.
3. WHERE an Event has Entry_Requirements defined, THE Event detail view SHALL display the full Entry_Requirements text.
4. WHEN the App determines the Student's Location_Context is off campus, THE Event detail view SHALL include a button labeled "Get Directions".
5. WHEN a Student taps "Get Directions", THE Maps_Service SHALL open Google Maps with the Event's campus address set as the destination.
6. IF the Maps_Service is unavailable, THEN THE App SHALL display an error message and provide the campus address as plain text.

---

### Requirement 4: Google Maps Navigation

**User Story:** As a student visiting from another campus, I want to get directions to an event location using Google Maps, so that I can navigate to an unfamiliar campus.

#### Acceptance Criteria

1. THE App SHALL determine the Student's Location_Context by comparing the Student's current device location against the campus geographic boundary.
2. WHEN the Student's Location_Context is off campus and a Student requests directions, THE Maps_Service SHALL launch Google Maps with turn-by-turn navigation to the Event location.
3. WHILE the Student's Location_Context is on campus, THE App SHALL NOT display the "Get Directions" button on Event detail views.
4. THE Maps_Service SHALL pass the Event's full campus address as the destination parameter to Google Maps.
5. IF the Student's device does not have Google Maps installed, THEN THE Maps_Service SHALL open the Google Maps web URL in the device's default browser.
6. THE Maps_Service SHALL support both the Google Maps iOS URI scheme and the Google Maps Android intent for native app launching.
7. IF the App is unable to determine the Student's Location_Context, THEN THE App SHALL display the "Get Directions" button as a fallback.

---

### Requirement 5: Browse Play Sessions

**User Story:** As a student, I want to browse one-time sports play sessions that are looking for participants, so that I can find people to play a sport with.

#### Acceptance Criteria

1. THE App SHALL display a list of active Session_Posts on the Sports_Tab.
2. WHEN a Student opens the Sports_Tab, THE App SHALL load and display all Session_Posts that still have open participant slots.
3. THE App SHALL display each Session_Post with the sport name, number of participants still needed, skill level, scheduled date and time, and a brief description.
4. WHEN no Session_Posts with open slots exist, THE App SHALL display a message indicating no play sessions are currently looking for participants.

---

### Requirement 6: Search for Play Sessions

**User Story:** As a student, I want to search for play sessions by sport type, so that I can find a session for the sport I want to play.

#### Acceptance Criteria

1. THE Sports_Tab SHALL provide a search input field that accepts sport name or keyword queries.
2. WHEN a Student submits a search query on the Sports_Tab, THE Search_Service SHALL return Session_Posts whose sport name or description contains the query string.
3. WHEN a search query returns no matching Session_Posts, THE App SHALL display a message indicating no play sessions were found for that sport.
4. WHEN a Student clears the search input on the Sports_Tab, THE App SHALL restore the full list of active Session_Posts.

---

### Requirement 7: Create a Play Session Post

**User Story:** As a student, I want to post that I am looking for people to join a one-time sports session, so that other students can find and join me.

#### Acceptance Criteria

1. THE Sports_Tab SHALL provide a button that allows a Student to create a new Session_Post.
2. WHEN a Student submits a new Session_Post, THE App SHALL require the sport name, number of additional participants needed (minimum 1), scheduled date and time, and a description.
3. WHEN a Student submits a Session_Post with all required fields completed, THE App SHALL publish the Session_Post and display it in the Sports_Tab list.
4. IF a Student submits a Session_Post with one or more required fields missing, THEN THE App SHALL display a validation error identifying the missing fields and SHALL NOT publish the post.
5. WHEN a Session_Post is published, THE App SHALL associate it with the creating Student's account.

---

### Requirement 8: Manage a Play Session Post

**User Story:** As a student who created a play session post, I want to edit or remove my post, so that I can keep the information accurate or close the session when it is full.

#### Acceptance Criteria

1. WHEN a Student views a Session_Post they created, THE App SHALL display options to edit or delete the post.
2. WHEN a Student edits a Session_Post, THE App SHALL apply the changes and display the updated post in the Sports_Tab.
3. WHEN a Student deletes a Session_Post, THE App SHALL remove the post from the Sports_Tab list.
4. WHILE a Student is editing a Session_Post, THE App SHALL pre-populate all fields with the existing post data.

---

### Requirement 9: Share an Event

**User Story:** As a student, I want to share an event with friends or on social media, so that I can let others know about events I find interesting.

#### Acceptance Criteria

1. WHEN a Student views an Event detail view, THE App SHALL display a share button.
2. WHEN a Student taps the share button, THE App SHALL invoke the device's native share sheet.
3. THE App SHALL compose share content that includes the Event's title, date, time, location name, and a plain-text summary of the Event.
4. WHERE the Event has a deep link or web URL available, THE App SHALL include that link in the share content.
5. IF the device's native share sheet is unavailable, THEN THE App SHALL display an error message indicating sharing is not supported on the current device.

---

### Requirement 10: Student Authentication

**User Story:** As a student, I want to sign in with my campus credentials, so that my posts and preferences are tied to my account.

#### Acceptance Criteria

1. THE App SHALL require a Student to authenticate before creating or managing a Session_Post.
2. WHEN a Student provides valid credentials, THE App SHALL grant access and maintain an authenticated session.
3. IF a Student provides invalid credentials, THEN THE App SHALL display an authentication error message and SHALL NOT grant access.
4. WHEN an authenticated session expires, THE App SHALL prompt the Student to re-authenticate before performing account-specific actions.
