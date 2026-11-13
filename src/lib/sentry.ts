/**
 * Crash reporting for the web app (Sentry). Off unless the build sets
 * VITE_SENTRY_DSN; every call is then a no-op.
 *
 * Uses the same scrubber as the phone app (src/lib/sentryScrub.ts), and the
 * same switches: no user, no session replay, no performance traces (their
 * span names are page addresses), no console breadcrumbs. An event that still
 * names PHI after scrubbing is dropped (AGENTS.md guardrail 9).
 */

import * as Sentry from '@sentry/react';
import { containsPhi, scrubBreadcrumb, scrubEvent } from './sentryScrub';

const MAX_BREADCRUMBS = 30;

let initialized = false;

/** Starts crash reporting when a DSN is configured; does nothing otherwise. */
export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return false;
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || 'dev',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: MAX_BREADCRUMBS,
      beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
      beforeSend: (event) => scrubEvent(event),
    });
    initialized = true;
  } catch {
    // Crash reporting must never be the thing that breaks the app.
    initialized = false;
  }
  return initialized;
}

/**
 * Reports an error the app caught itself (the error boundary). Only the error
 * and the names of the components it passed through go: callers cannot attach
 * free-form context, so nothing a screen was holding can ride along. An error
 * whose own message names PHI is not sent at all.
 */
export function captureSentryException(error: Error, componentStack?: string): void {
  if (!initialized) return;
  if (containsPhi(error.message)) return;
  Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
}
