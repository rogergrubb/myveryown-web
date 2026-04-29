// Catches errors from any child subtree (e.g., the lazy-loaded globe)
// so a single broken component doesn't unmount the whole dashboard.

import { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(240,237,232,0.55)',
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.85rem',
        }}>
          This component crashed: <code style={{ color: '#ff8888' }}>{this.state.message}</code>
        </div>
      );
    }
    return this.props.children;
  }
}
