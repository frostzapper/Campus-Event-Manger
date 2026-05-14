import React, { useState } from 'react';
import type { AuthService } from '@campus-event-finder/shared';

interface LoginFormProps {
  authService: AuthService;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function LoginForm({ authService, onSuccess, onCancel }: LoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authService.login(email, password);
      onSuccess();
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="form-page" style={{ paddingTop: '3rem' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '2rem', boxShadow: 'var(--shadow-md)',
      }}>
        <h1 className="form-title">Welcome back 👋</h1>
        <p className="form-subtitle">Sign in with your campus credentials.</p>

        {error && <div className="form-submit-error" role="alert">{error}</div>}

        <form onSubmit={e => { void handleSubmit(e); }} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Campus email</label>
            <input id="email" className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@campus.edu" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
            {onCancel && (
              <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            )}
          </div>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Demo: alice@campus.edu / password123
        </p>
      </div>
    </div>
  );
}
