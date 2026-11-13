import * as Sentry from '@sentry/react-native';
import { scrubBreadcrumb, scrubEvent, scrubText } from '@/lib/sentryScrub';
import { isDev } from '@/core/env';

/**
 * Crash reporting for the phone app (Sentry). Off unless the build sets
 * EXPO_PUBLIC_SENTRY_DSN. Uses the same scrubber as the web wrapper
 * (src/lib/sentry.ts); a crash event can carry what a student typed or which
 * screen they were on, so:
 * - no user, no IP, no request bodies, headers, cookies or query strings;
 * - breadcrumbs keep only their category and level (no URLs, no route params,
 *   no console text); touch and navigation tracing are off;
 * - no screenshots, view hierarchy or performance traces;
 * - message text is scrubbed for PHI keywords, e-mail addresses and long
 *   digit runs (phone, Aadhaar, ABHA), and an event that still names PHI is
 *   dropped (AGENTS.md guardrail 9).
 */

const MAX_BREADCRUMBS = 30;

export { scrubBreadcrumb, scrubEvent, scrubText };

let started = false;

/** Starts crash reporting when a DSN is configured; does nothing otherwise. */
export function startCrashReporting(): boolean {
  if (started) return true;
  // Expo inlines only static process.env.EXPO_PUBLIC_* reads.
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV?.trim() || (isDev() ? 'development' : 'production'),
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    attachStacktrace: true,
    enableCaptureFailedRequests: false,
    enableUserInteractionTracing: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: MAX_BREADCRUMBS,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSend: (event) => scrubEvent(event),
  });
  started = true;
  return true;
}
