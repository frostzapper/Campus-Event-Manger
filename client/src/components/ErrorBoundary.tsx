import React, { type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown when the subtree throws (must be a valid React element). */
  fallbackTitle?: string;
  /**
   * When provided, used instead of the default full fallback UI (e.g. `null` to hide a broken widget).
   */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors in child components so the whole SPA does not unmount to a blank root.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console -- intentional debug aid
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { children, fallbackTitle = 'Something went wrong', fallback } = this.props;
    const { error } = this.state;

    if (error) {
      if (fallback !== undefined) {
        return fallback;
      }
      return (
        <div
          className="container"
          style={{
            padding: '3rem 1.5rem',
            maxWidth: 560,
            margin: '0 auto',
            textAlign: 'center',
          }}
          role="alert"
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text)' }}>
            {fallbackTitle}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            This part of the app hit an unexpected error. You can try again, refresh the page, or continue using other areas of the site.
          </p>
          {import.meta.env.DEV && (
            <pre
              style={{
                textAlign: 'left',
                fontSize: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                overflow: 'auto',
                marginBottom: '1.25rem',
                maxHeight: 160,
              }}
            >
              {error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={this.handleRetry}>
              Try again
            </button>
            <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
