import React, { Component, ReactNode } from 'react';
import { captureSentryException } from '@/lib/sentry';
import { useT } from '@/i18n';

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
      return <CrashNotice onRetry={() => this.setState({ error: null, stack: '' })} />;
    }
    return this.props.children;
  }
}

/**
 * What a person sees after a crash. The error's own message is not shown: it
 * is written for developers and can carry whatever the failing code held.
 * Sentry has it.
 */
function CrashNotice({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return <div className="wf-state wf-state-error" role="alert">
    <h3>{t('state.crashTitle')}</h3>
    <p>{t('state.crashBody')}</p>
    <button className="health-button" onClick={onRetry}>{t('common.tryAgain')}</button>
  </div>;
}
