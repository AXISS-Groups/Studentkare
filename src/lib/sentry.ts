/**
 * Crash reporting for the web app (Sentry). Off unless the build sets
 * VITE_SENTRY_DSN; every call is then a no-op.
 *
 * Uses the same closed metadata schema and final envelope boundary as the phone
 * app. No free-form error text, URLs, private context or other envelope types.
 */

import * as Sentry from '@sentry/react';
import { scrubBreadcrumb, scrubEvent } from './sentryScrub';
import { privacyTransport } from './sentryTransport';

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
      autoSessionTracking: false,
      sendClientReports: false,
      maxBreadcrumbs: MAX_BREADCRUMBS,
      beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
      beforeSend: (event) => scrubEvent(event),
      beforeSendTransaction: () => null,
      transport: privacyTransport(Sentry.makeFetchTransport),
    });
    initialized = true;
  } catch {
    // Crash reporting must never be the thing that breaks the app.
    initialized = false;
  }
  return initialized;
}

/**
 * Reports an error the app caught itself. Only its built-in class is eligible
 * for transmission; the shared boundary excludes its message and stack.
 */
export function captureSentryException(error: Error, _componentStack?: string): void {
  if (!initialized) return;
  Sentry.captureException(error);
}
