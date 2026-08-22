import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

/** App-wide error boundary so a render error never blanks the whole WebView. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  private reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
          <div className="mb-4 text-4xl">🛠️</div>
          <h2 className="text-lg font-bold text-ink">Something broke</h2>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            An unexpected error occurred. You can try again — your data is safe.
          </p>
          <button className="btn-primary mt-6" onClick={this.reset}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
