import React, { Component, ReactNode } from 'react';
import { captureSentryException } from '@/lib/sentry';

interface Props { children: ReactNode; }
interface State { error: Error | null; stack: string; }

/** Catches render/lifecycle errors so a crash never shows a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: '' };
  static getDerivedStateFromError(error: Error): State { return { error, stack: '' }; }
  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    captureSentryException(error, { componentStack: info.componentStack });
  }
  render() {
    if (this.state.error) {
      return <div className="wf-state wf-state-error" role="alert">
        <h3>Something went wrong.</h3>
        <p>{this.state.error.message || 'The page could not be rendered.'}</p>
        <button className="health-button" onClick={() => this.setState({ error: null, stack: '' })}>Try again</button>
      </div>;
    }
    return this.props.children;
  }
}
