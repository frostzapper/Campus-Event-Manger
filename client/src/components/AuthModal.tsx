import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AuthService } from '@campus-event-finder/shared';

// ── Types ─────────────────────────────────────────────────────────────────
type AuthTab = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  authService: AuthService;
  onSuccess: () => void;
  onClose: () => void;
  prompt?: string;
  initialTab?: AuthTab;
}

// ── Validation helpers ────────────────────────────────────────────────────
function validateEmail(v: string): string {
  if (!v.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return '';
}
function validatePassword(v: string): string {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  return '';
}
function validateName(v: string): string {
  if (!v.trim()) return 'Name is required';
  if (v.trim().length < 2) return 'Name must be at least 2 characters';
  return '';
}

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner(): React.ReactElement {
  return (
    <span className="auth-spinner" aria-hidden="true">
      <span /><span /><span />
    </span>
  );
}

// ── Social button ─────────────────────────────────────────────────────────
function SocialBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }): React.ReactElement {
  return (
    <button type="button" className="auth-social-btn" onClick={onClick} aria-label={`Continue with ${label}`}>
      {icon}
      <span>Continue with {label}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function AuthModal({ authService, onSuccess, onClose, prompt, initialTab = 'login' }: AuthModalProps): React.ReactElement {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [animating, setAnimating] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap & keyboard
  useEffect(() => { firstInputRef.current?.focus(); }, [tab]);
  useEffect(() => {
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function switchTab(next: AuthTab): void {
    if (next === tab) return;
    setAnimating(true);
    setTimeout(() => { setTab(next); setAnimating(false); }, 180);
  }

  const panelClass = `auth-panel${animating ? ' auth-panel-exit' : ' auth-panel-enter'}`;

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="auth-modal-wide" onClick={e => e.stopPropagation()} ref={modalRef}>

        {/* ── Left panel — branding ── */}
        <div className="auth-left" aria-hidden="true">
          <div className="auth-left-shapes">
            <div className="auth-left-shape" />
            <div className="auth-left-shape" />
          </div>
          <div className="auth-left-content">
            <div className="auth-left-logo">🎓</div>
            <h2 className="auth-left-title">Campus Event Finder</h2>
            <p className="auth-left-sub">Discover events, find play sessions, and connect with your campus community.</p>
            <ul className="auth-left-features">
              <li>✅ Browse all campus events for free</li>
              <li>✅ Find sports play sessions</li>
              <li>🔒 Register for events</li>
              <li>🔒 Post your own sessions</li>
            </ul>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="auth-right">
          <button className="auth-modal-close" onClick={onClose} aria-label="Close">✕</button>

          {/* Tab switcher (only for login/register) */}
          {tab !== 'forgot' && (
            <div className="auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === 'login'}
                className={`auth-tab${tab === 'login' ? ' active' : ''}`}
                onClick={() => switchTab('login')}
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={tab === 'register'}
                className={`auth-tab${tab === 'register' ? ' active' : ''}`}
                onClick={() => switchTab('register')}
              >
                Create Account
              </button>
            </div>
          )}

          {prompt && tab === 'login' && (
            <p className="auth-modal-prompt">{prompt}</p>
          )}

          <div className={panelClass}>
            {tab === 'login' && (
              <LoginPanel
                authService={authService}
                onSuccess={onSuccess}
                onForgot={() => switchTab('forgot')}
                firstInputRef={firstInputRef}
              />
            )}
            {tab === 'register' && (
              <RegisterPanel
                authService={authService}
                onSuccess={onSuccess}
                firstInputRef={firstInputRef}
              />
            )}
            {tab === 'forgot' && (
              <ForgotPanel
                onBack={() => switchTab('login')}
                firstInputRef={firstInputRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Login panel ───────────────────────────────────────────────────────────
function LoginPanel({ authService, onSuccess, onForgot, firstInputRef }: {
  authService: AuthService;
  onSuccess: () => void;
  onForgot: () => void;
  firstInputRef: React.RefObject<HTMLInputElement>;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function validate(): boolean {
    const e = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(e);
    return !e.email && !e.password;
  }

  async function handleSubmit(ev: React.FormEvent): Promise<void> {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError(null);
    setIsLoading(true);
    try {
      await authService.login(email, password);
      onSuccess();
    } catch {
      setSubmitError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 className="auth-form-title">Welcome back 👋</h2>
      <p className="auth-form-sub">Sign in to your campus account</p>

      {/* Social buttons */}
      <div className="auth-social-group">
        <SocialBtn
          icon={<GoogleIcon />}
          label="Google"
          onClick={() => alert('Google OAuth not configured — use email/password for demo.')}
        />
        <SocialBtn
          icon={<GitHubIcon />}
          label="GitHub"
          onClick={() => alert('GitHub OAuth not configured — use email/password for demo.')}
        />
      </div>

      <div className="auth-divider"><span>or continue with email</span></div>

      {submitError && <div className="form-submit-error" role="alert">{submitError}</div>}

      <form onSubmit={ev => { void handleSubmit(ev); }} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Campus email</label>
          <input
            id="login-email"
            ref={firstInputRef}
            className={`form-input${errors.email ? ' input-error' : ''}`}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
            placeholder="you@campus.edu"
            autoComplete="email"
          />
          {errors.email && <div className="form-error" role="alert">{errors.email}</div>}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
            <button type="button" className="auth-link-btn" onClick={onForgot}>Forgot password?</button>
          </div>
          <div className="auth-pw-wrap">
            <input
              id="login-password"
              className={`form-input${errors.password ? ' input-error' : ''}`}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <div className="form-error" role="alert">{errors.password}</div>}
        </div>

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? <><Spinner /> Signing in…</> : 'Sign In'}
        </button>
      </form>

      <p className="auth-modal-hint">
        Demo: <strong>alice@campus.edu</strong> / <strong>password123</strong>
      </p>
    </div>
  );
}

// ── Register panel ────────────────────────────────────────────────────────
function RegisterPanel({ authService, onSuccess, firstInputRef }: {
  authService: AuthService;
  onSuccess: () => void;
  firstInputRef: React.RefObject<HTMLInputElement>;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm !== password ? 'Passwords do not match' : '',
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleSubmit(ev: React.FormEvent): Promise<void> {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitError(null);
    setIsLoading(true);
    try {
      await authService.signup(name, email, password);
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">🎉</div>
        <h3>Account created!</h3>
        <p>Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="auth-form-title">Join Campus Events 🎓</h2>
      <p className="auth-form-sub">Create your free account</p>

      <div className="auth-social-group">
        <SocialBtn icon={<GoogleIcon />} label="Google" onClick={() => alert('Google OAuth not configured.')} />
        <SocialBtn icon={<GitHubIcon />} label="GitHub" onClick={() => alert('GitHub OAuth not configured.')} />
      </div>

      <div className="auth-divider"><span>or sign up with email</span></div>

      {submitError && <div className="form-submit-error" role="alert">{submitError}</div>}

      <form onSubmit={ev => { void handleSubmit(ev); }} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            ref={firstInputRef}
            className={`form-input${errors.name ? ' input-error' : ''}`}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
            placeholder="Alex Johnson"
            autoComplete="name"
          />
          {errors.name && <div className="form-error" role="alert">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Campus email</label>
          <input
            id="reg-email"
            className={`form-input${errors.email ? ' input-error' : ''}`}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
            placeholder="you@campus.edu"
            autoComplete="email"
          />
          {errors.email && <div className="form-error" role="alert">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <div className="auth-pw-wrap">
            <input
              id="reg-password"
              className={`form-input${errors.password ? ' input-error' : ''}`}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
            <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <div className="form-error" role="alert">{errors.password}</div>}
          {/* Strength bar */}
          {password && <PasswordStrength password={password} />}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
          <input
            id="reg-confirm"
            className={`form-input${errors.confirm ? ' input-error' : ''}`}
            type="password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors(p => ({ ...p, confirm: '' })); }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {errors.confirm && <div className="form-error" role="alert">{errors.confirm}</div>}
        </div>

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? <><Spinner /> Creating account…</> : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

// ── Forgot password panel ─────────────────────────────────────────────────
function ForgotPanel({ onBack, firstInputRef }: {
  onBack: () => void;
  firstInputRef: React.RefObject<HTMLInputElement>;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(ev: React.FormEvent): Promise<void> {
    ev.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">📧</div>
        <h3>Check your inbox</h3>
        <p>We sent a reset link to <strong>{email}</strong></p>
        <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={onBack}>← Back to Sign In</button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="auth-back-btn" onClick={onBack}>← Back to Sign In</button>
      <h2 className="auth-form-title">Reset password 🔑</h2>
      <p className="auth-form-sub">Enter your campus email and we'll send you a reset link.</p>

      <form onSubmit={ev => { void handleSubmit(ev); }} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="forgot-email">Campus email</label>
          <input
            id="forgot-email"
            ref={firstInputRef}
            className={`form-input${emailError ? ' input-error' : ''}`}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(''); }}
            placeholder="you@campus.edu"
            autoComplete="email"
          />
          {emailError && <div className="form-error" role="alert">{emailError}</div>}
        </div>

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? <><Spinner /> Sending…</> : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────
function PasswordStrength({ password }: { password: string }): React.ReactElement {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <div className="auth-strength" aria-label={`Password strength: ${labels[score]}`}>
      <div className="auth-strength-bars">
        {[1,2,3,4].map(i => (
          <div key={i} className="auth-strength-bar" style={{ background: i <= score ? colors[score] : 'var(--border)' }} />
        ))}
      </div>
      <span className="auth-strength-label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────
function GoogleIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}
