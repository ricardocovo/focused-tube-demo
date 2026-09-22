import React from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">⚠️</div>
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-text">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={this.handleReload}
            className="error-boundary-btn"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
