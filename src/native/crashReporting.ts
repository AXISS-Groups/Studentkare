import * as Sentry from '@sentry/react-native';
import type { Breadcrumb } from '@sentry/react-native';
import { REDACTED_PHI, containsPhi, scrubPhi } from '@/lib/sentryScrub';
import { isDev } from '@/core/env';

/**
 * Crash reporting for the phone app (Sentry). Off unless the build sets
 * EXPO_PUBLIC_SENTRY_DSN. Stricter than the web wrapper (src/lib/sentry.ts),
 * because a phone event can carry what a student typed or which screen they
 * were on:
 * - no user, no IP, no request bodies, headers, cookies or query strings;
 * - breadcrumbs keep only their category and level (no URLs, no route params,
 *   no console text); touch and navigation tracing are off;
 * - no screenshots, view hierarchy or performance traces;
 * - message text is scrubbed for PHI keywords, e-mail addresses and long
 *   digit runs (phone, Aadhaar, ABHA), and an event that still names PHI is
 *   dropped (AGENTS.md guardrail 9).
 */

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type ErrorEvent = Parameters<NonNullable<SentryOptions['beforeSend']>>[0];

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
/** Phone numbers, Aadhaar (12) and ABHA (14) numbers, with or without separators. */
const LONG_NUMBER = /\+?\d(?:[\s-]?\d){7,}/g;
const MAX_BREADCRUMBS = 30;

export function scrubText(text: string): string {
  if (containsPhi(text)) return REDACTED_PHI;
  return text.replace(EMAIL, '[email]').replace(LONG_NUMBER, '[number]');
}

/** Strips query and fragment: ids and search terms travel there. */
function stripUrl(url: string): string {
  return url.split(/[?#]/)[0] ?? '';
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  // Console lines can hold anything a screen logged; drop them outright.
  if (crumb.category === 'console') return null;
  return { type: crumb.type, category: crumb.category, level: crumb.level, timestamp: crumb.timestamp };
}

export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  const scrubbed: ErrorEvent = { ...event };
  delete scrubbed.user;
  delete scrubbed.extra;
  delete scrubbed.server_name;
  if (scrubbed.request) {
    scrubbed.request = scrubbed.request.url ? { url: stripUrl(scrubbed.request.url) } : {};
  }
  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message);
  if (scrubbed.exception?.values) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((value) => ({
        ...value,
        value: value.value ? scrubText(value.value) : value.value,
        stacktrace: value.stacktrace
          ? { ...value.stacktrace, frames: value.stacktrace.frames?.map(({ vars: _vars, ...frame }) => frame) }
          : value.stacktrace,
      })),
    };
  }
  if (scrubbed.breadcrumbs) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map(scrubBreadcrumb).filter((crumb): crumb is Breadcrumb => crumb !== null);
  }
  if (scrubbed.contexts) scrubbed.contexts = scrubPhi(scrubbed.contexts);
  if (scrubbed.tags) scrubbed.tags = scrubPhi(scrubbed.tags);
  if (containsPhi(JSON.stringify(scrubbed))) return null;
  return scrubbed;
}

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
