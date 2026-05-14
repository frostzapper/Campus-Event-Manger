import React, { useState, useEffect } from 'react';
import type { Event, SessionPost, Student, AuthSession } from '@campus-event-finder/shared';
import { EventDetailView } from './components/EventDetailView';
import { SessionPostDetail } from './components/SessionPostDetail';
import { SessionPostForm } from './components/SessionPostForm';
import { AuthModal } from './components/AuthModal';
import { AuthServiceImpl } from './services/AuthServiceImpl';
import { LocationServiceImpl } from './services/LocationServiceImpl';
import { MapsServiceImpl } from './services/MapsServiceImpl';
import { ShareServiceImpl } from './services/ShareServiceImpl';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { SportsPage } from './pages/SportsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { MyEventsDashboard } from './pages/MyEventsDashboard';
import { OrganizerProfile } from './pages/OrganizerProfile';
import { NotificationBell } from './components/NotificationBell';
import { ReminderPrefsPage } from './pages/ReminderPrefsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';

const authService = new AuthServiceImpl();
const locationService = new LocationServiceImpl();
const mapsService = new MapsServiceImpl();
const shareService = new ShareServiceImpl();

type Page = 'home' | 'events' | 'sports';

type View =
  | { screen: 'page'; page: Page }
  | { screen: 'eventDetail'; event: Event }
  | { screen: 'sessionDetail'; session: SessionPost }
  | { screen: 'createPost' }
  | { screen: 'editPost'; session: SessionPost }
  | { screen: 'createEvent' }
  | { screen: 'editEvent'; event: Event }
  | { screen: 'dashboard' }
  | { screen: 'organizerProfile'; organizerId: string }
  | { screen: 'reminderPrefs' };

/** Pending action to execute after the user signs in */
type PendingAction =
  | { type: 'register'; event: Event }
  | { type: 'createPost' }
  | { type: 'editPost'; session: SessionPost }
  | { type: 'createEvent' }
  | { type: 'editEvent'; event: Event }
  | { type: 'follow'; organizerId: string };

function viewRequiresAuth(v: View): boolean {
  switch (v.screen) {
    case 'dashboard':
    case 'reminderPrefs':
    case 'createEvent':
    case 'editEvent':
    case 'createPost':
    case 'editPost':
      return true;
    default:
      return false;
  }
}

/** Safe screen when session is missing on a protected route (e.g. after sign-out). */
function getFallbackViewForUnauthorized(current: View): View {
  switch (current.screen) {
    case 'editPost':
    case 'createPost':
      return { screen: 'page', page: 'sports' };
    case 'editEvent':
    case 'createEvent':
      return { screen: 'page', page: 'events' };
    case 'dashboard':
    case 'reminderPrefs':
      return { screen: 'page', page: 'home' };
    default:
      return { screen: 'page', page: 'home' };
  }
}

function AuthSessionRedirectShell({
  navbar,
  footer,
  authModal,
}: {
  navbar: React.ReactElement;
  footer: React.ReactElement;
  authModal: React.ReactElement | null;
}): React.ReactElement {
  return (
    <>
      {navbar}
      <main className="section" aria-busy="true" aria-live="polite">
        <div className="container" style={{ padding: '2.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Redirecting…
        </div>
      </main>
      {footer}
      {authModal}
    </>
  );
}

/** Keeps navbar/footer usable if a single screen throws during render. */
function ScreenErrorBoundary({ children }: { children: React.ReactNode }): React.ReactElement {
  return <ErrorBoundary fallbackTitle="This screen hit a problem">{children}</ErrorBoundary>;
}

export function App(): React.ReactElement {
  const [view, setView] = useState<View>({ screen: 'page', page: 'home' });
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try { return authService.getSession(); } catch { return null; }
  });
  const [isOnCampus, setIsOnCampus] = useState<boolean | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    locationService.getCurrentLocation()
      .then(coords => setIsOnCampus(locationService.isOnCampus(coords)))
      .catch(() => setIsOnCampus(null));
  }, []);

  /**
   * Never update navigation state during render. When the session disappears while the user is on a
   * protected screen (sign-out, cleared storage), sync view in an effect so React stays in a valid state.
   */
  useEffect(() => {
    if (authSession !== null) return;
    setView(current => (viewRequiresAuth(current) ? getFallbackViewForUnauthorized(current) : current));
  }, [authSession]);

  // ── Auth helpers ─────────────────────────────────────────────────────────

  /**
   * Show the auth modal. After login, `action` will be executed automatically.
   * The user stays on the current page — no navigation happens.
   */
  function requireAuth(action: PendingAction, prompt?: string): void {
    setPendingAction(action);
    setAuthModalPrompt(prompt);
    setAuthModalOpen(true);
  }

  function handleLoginSuccess(): void {
    const session = authService.getSession();
    setAuthSession(session);
    setAuthModalOpen(false);

    // Execute the preserved action
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      if (action.type === 'createPost') {
        setView({ screen: 'createPost' });
      } else if (action.type === 'editPost') {
        setView({ screen: 'editPost', session: action.session });
      } else if (action.type === 'createEvent') {
        setView({ screen: 'createEvent' });
      } else if (action.type === 'editEvent') {
        setView({ screen: 'editEvent', event: action.event });
      } else if (action.type === 'follow') {
        setView({ screen: 'organizerProfile', organizerId: action.organizerId });
      }
      // 'register' just opens the event detail — already there, nothing extra needed
    }
  }

  function handleModalClose(): void {
    setAuthModalOpen(false);
    setPendingAction(null);
  }

  function handleLogout(): void {
    authService.logout();
    setAuthSession(null);
    setView(v => (viewRequiresAuth(v) ? getFallbackViewForUnauthorized(v) : v));
  }

  const currentStudent: Student | null = authSession
    ? { id: authSession.studentId, email: '', displayName: '', passwordHash: '' }
    : null;

  async function handleShare(event: Event): Promise<void> {
    setShareError(null);
    try { await shareService.shareEvent(event); }
    catch (err) { setShareError(err instanceof Error ? err.message : 'Sharing not supported'); }
  }

  const currentPage = view.screen === 'page' ? view.page : null;

  // ── Navbar ───────────────────────────────────────────────────────────────
  const navbar = (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        <button
          className="navbar-logo"
          onClick={() => setView({ screen: 'page', page: 'home' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Campus Event Finder home"
        >
          <span className="navbar-logo-icon">🎓</span>
          Campus Event Finder
        </button>

        <ul className={`navbar-links${menuOpen ? ' open' : ''}`} role="list">
          {(['home', 'events', 'sports'] as Page[]).map(p => (
            <li key={p}>
              <button
                className={currentPage === p ? 'active' : ''}
                onClick={() => { setView({ screen: 'page', page: p }); setMenuOpen(false); }}
              >
                {p === 'home' ? 'Home' : p === 'events' ? 'Events' : 'Play Sessions'}
              </button>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          {authSession ? (
            <>
              <ErrorBoundary fallback={null}>
                <NotificationBell
                  authToken={authSession.token}
                  onSelectEvent={eventId => {
                    // Fetch the event and navigate to its detail
                    fetch(`${(import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'}/events/${eventId}`)
                      .then(r => r.ok ? r.json() : null)
                      .then((evt: Event | null) => { if (evt) setView({ screen: 'eventDetail', event: evt }); })
                      .catch(() => {});
                  }}
                  onSelectProfile={userId => setView({ screen: 'organizerProfile', organizerId: userId })}
                />
              </ErrorBoundary>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setView({ screen: 'dashboard' })}
              >
                My Events
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setView({ screen: 'reminderPrefs' })}
                title="Reminder settings"
                aria-label="Reminder settings"
              >
                ⚙️
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setView({ screen: 'createEvent' })}
              >
                + Create Event
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setAuthModalOpen(true)}
            >
              Sign In
            </button>
          )}
        </div>

        <button
          className="navbar-hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );

  // ── Auth modal (rendered on top of everything) ───────────────────────────
  const authModal = authModalOpen ? (
    <AuthModal
      authService={authService}
      onSuccess={handleLoginSuccess}
      onClose={handleModalClose}
      prompt={authModalPrompt}
    />
  ) : null;

  // ── Event detail ─────────────────────────────────────────────────────────
  if (view.screen === 'eventDetail') {
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <div className="detail-page">
            <button className="detail-back" onClick={() => setView({ screen: 'page', page: 'events' })}>
              ← Back to Events
            </button>
            {shareError && <div className="alert alert-error" role="alert">{shareError}</div>}
            <EventDetailView
              event={view.event}
              isOnCampus={isOnCampus}
              isAuthenticated={!!authSession}
              onGetDirections={addr => { void mapsService.openDirections(addr); }}
              onShare={evt => { void handleShare(evt); }}
              onRegister={async evt => {
                if (!authSession) {
                  requireAuth(
                    { type: 'register', event: evt },
                    `Sign in to register for "${evt.title}"`
                  );
                } else {
                  try {
                    const response = await fetch(`${(import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'}/dashboard/join/${evt.id}`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${authSession.token}` },
                    });
                    const data = await response.json();
                    if (response.ok) {
                      if (data.alreadyRegistered) {
                        alert(`You're already registered for "${evt.title}"!`);
                      } else {
                        alert(`Successfully registered for "${evt.title}"!`);
                        // Refresh event data to show "Already Registered" state
                        const refreshRes = await fetch(`${(import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'}/events/${evt.id}`, {
                          headers: { Authorization: `Bearer ${authSession.token}` },
                        });
                        if (refreshRes.ok) {
                          const updated = await refreshRes.json();
                          setView({ screen: 'eventDetail', event: updated });
                        }
                      }
                    } else {
                      alert(data.message || 'Failed to register for event');
                    }
                  } catch (err) {
                    alert('An error occurred during registration. Please try again.');
                  }
                }
              }}
              onEdit={view.event.creatorId === authSession?.studentId
                ? () => setView({ screen: 'editEvent', event: view.event })
                : undefined
              }
              onDelete={view.event.creatorId === authSession?.studentId
                ? async () => {
                    if (!confirm('Delete this event? This cannot be undone.')) return;
                    await fetch(`${(import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'}/events/${view.event.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${authSession!.token}` },
                    });
                    setView({ screen: 'page', page: 'events' });
                  }
                : undefined
              }
              onViewOrganizer={view.event.creatorId
                ? (id) => setView({ screen: 'organizerProfile', organizerId: id })
                : undefined
              }
            />
          </div>
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
        {authModal}
      </>
    );
  }

  // ── Session detail ───────────────────────────────────────────────────────
  if (view.screen === 'sessionDetail') {
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <div className="detail-page">
            <button className="detail-back" onClick={() => setView({ screen: 'page', page: 'sports' })}>
              ← Back to Play Sessions
            </button>
            <SessionPostDetail
              post={view.session}
              currentStudent={currentStudent}
              authToken={authSession?.token ?? ''}
              onEdit={() => {
                if (!authSession) {
                  requireAuth({ type: 'editPost', session: view.session }, 'Sign in to edit this post');
                } else {
                  setView({ screen: 'editPost', session: view.session });
                }
              }}
              onDelete={() => setView({ screen: 'page', page: 'sports' })}
            />
          </div>
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
        {authModal}
      </>
    );
  }

  // ── Organizer profile ────────────────────────────────────────────────────
  if (view.screen === 'organizerProfile') {
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <OrganizerProfile
            organizerId={view.organizerId}
            authToken={authSession?.token}
            currentStudentId={authSession?.studentId}
            onBack={() => history.length > 1 ? setView({ screen: 'page', page: 'events' }) : setView({ screen: 'page', page: 'events' })}
            onSelectEvent={event => setView({ screen: 'eventDetail', event })}
            onRequireAuth={() => requireAuth({ type: 'follow', organizerId: view.organizerId }, 'Sign in to follow this organizer')}
          />
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
        {authModal}
      </>
    );
  }

  // ── Reminder preferences ─────────────────────────────────────────────────
  if (view.screen === 'reminderPrefs') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <ReminderPrefsPage
            authToken={authSession.token}
            onBack={() => setView({ screen: 'dashboard' })}
          />
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
      </>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (view.screen === 'dashboard') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <MyEventsDashboard
            authToken={authSession.token}
            studentId={authSession.studentId}
            onSelectEvent={event => setView({ screen: 'eventDetail', event })}
            onEditEvent={event => setView({ screen: 'editEvent', event })}
            onCreateEvent={() => setView({ screen: 'createEvent' })}
          />
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
        {authModal}
      </>
    );
  }

  // ── Create event ─────────────────────────────────────────────────────────
  if (view.screen === 'createEvent') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <CreateEventPage
            authToken={authSession.token}
            onSuccess={event => setView({ screen: 'eventDetail', event })}
            onCancel={() => setView({ screen: 'page', page: 'events' })}
          />
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
      </>
    );
  }

  // ── Edit event ────────────────────────────────────────────────────────────
  if (view.screen === 'editEvent') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <CreateEventPage
            authToken={authSession.token}
            existingEvent={view.event}
            onSuccess={event => setView({ screen: 'eventDetail', event })}
            onCancel={() => setView({ screen: 'eventDetail', event: view.event })}
          />
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
      </>
    );
  }

  // ── Create post ──────────────────────────────────────────────────────────
  if (view.screen === 'createPost') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <div className="form-page">
            <button className="detail-back" onClick={() => setView({ screen: 'page', page: 'sports' })}>
              ← Cancel
            </button>
            <h1 className="form-title">New Play Session</h1>
            <p className="form-subtitle">Looking for people to join your game? Post it here.</p>
            <SessionPostForm
              authToken={authSession.token}
              onSuccess={() => setView({ screen: 'page', page: 'sports' })}
              onCancel={() => setView({ screen: 'page', page: 'sports' })}
            />
          </div>
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
      </>
    );
  }

  // ── Edit post ────────────────────────────────────────────────────────────
  if (view.screen === 'editPost') {
    if (!authSession) {
      return <AuthSessionRedirectShell navbar={navbar} footer={<AppFooter />} authModal={authModal} />;
    }
    return (
      <>
        {navbar}
        <main>
          <ScreenErrorBoundary>
          <div className="form-page">
            <button className="detail-back" onClick={() => setView({ screen: 'sessionDetail', session: view.session })}>
              ← Cancel
            </button>
            <h1 className="form-title">Edit Play Session</h1>
            <p className="form-subtitle">Update the details of your session post.</p>
            <SessionPostForm
              existingPost={view.session}
              authToken={authSession.token}
              onSuccess={() => setView({ screen: 'page', page: 'sports' })}
              onCancel={() => setView({ screen: 'sessionDetail', session: view.session })}
            />
          </div>
          </ScreenErrorBoundary>
        </main>
        <AppFooter />
      </>
    );
  }

  // ── Main pages (home / events / sports) ──────────────────────────────────
  return (
    <>
      {navbar}
      <main>
        <ScreenErrorBoundary>
        {currentPage === 'home' && (
          <HomePage
            onExploreEvents={() => setView({ screen: 'page', page: 'events' })}
            onExploreSports={() => setView({ screen: 'page', page: 'sports' })}
            onSelectEvent={event => setView({ screen: 'eventDetail', event })}
            onSelectSession={session => setView({ screen: 'sessionDetail', session })}
            isAuthenticated={!!authSession}
            authToken={authSession?.token}
            onRequireAuth={(action, prompt) => requireAuth(action, prompt)}
            onViewOrganizer={id => setView({ screen: 'organizerProfile', organizerId: id })}
          />
        )}
        {currentPage === 'events' && (
          <EventsPage
            onSelectEvent={event => setView({ screen: 'eventDetail', event })}
            isAuthenticated={!!authSession}
            onRequireAuth={(action, prompt) => requireAuth(action, prompt)}
          />
        )}
        {currentPage === 'sports' && (
          <SportsPage
            authService={authService}
            onSelectSession={session => setView({ screen: 'sessionDetail', session })}
            onCreatePost={() => {
              if (!authSession) {
                requireAuth({ type: 'createPost' }, 'Sign in to post a play session');
              } else {
                setView({ screen: 'createPost' });
              }
            }}
            onRequireAuth={() => requireAuth({ type: 'createPost' }, 'Sign in to post a play session')}
          />
        )}
        </ScreenErrorBoundary>
      </main>
      <AppFooter />
      {authModal}
    </>
  );
}

function AppFooter(): React.ReactElement {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">🎓 Campus Event Finder</div>
            <p className="footer-desc">Discover events, find sports sessions, and connect with your campus community.</p>
          </div>
          <div>
            <div className="footer-heading">Explore</div>
            <ul className="footer-links">
              <li><a href="#">Events</a></li>
              <li><a href="#">Play Sessions</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">Account</div>
            <ul className="footer-links">
              <li><a href="#">Sign In</a></li>
              <li><a href="#">My Posts</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">About</div>
            <ul className="footer-links">
              <li><a href="#">How It Works</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© {new Date().getFullYear()} Campus Event Finder</span>
          <div className="footer-social" aria-label="Social links">
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="Instagram">📸</a>
            <a href="#" aria-label="Discord">💬</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
