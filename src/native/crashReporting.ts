import * as Sentry from '@sentry/react-native';
import { makeFetchTransport } from '@sentry/react';
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentryScrub';
import { privacyTransport } from '@/lib/sentryTransport';
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
 * - errors retain only enumerated metadata. The final JavaScript transport also
 *   denies side envelopes. Native SDK capture is off because its crash path and
 *   disk cache bypass these JavaScript privacy hooks.
 */

const MAX_BREADCRUMBS = 30;

export { scrubBreadcrumb, scrubEvent };

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
    enableNative: false,
    autoInitializeNativeSdk: false,
    enableNativeCrashHandling: false,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    autoSessionTracking: false,
    sendClientReports: false,
    maxBreadcrumbs: MAX_BREADCRUMBS,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: () => null,
    transport: privacyTransport(makeFetchTransport),
  });
  started = true;
  return true;
}
