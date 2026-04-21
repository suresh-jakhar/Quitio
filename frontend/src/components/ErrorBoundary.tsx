import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--space-lg)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
