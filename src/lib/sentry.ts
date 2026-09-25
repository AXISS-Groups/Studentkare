/**
 * StudentKare — Sentry wrapper (opt-in, PHI-safe).
 * Config comes from VITE_SENTRY_DSN environment variable.
 * If not set, all calls are no-ops.
 */

import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/browser";

const PHI_KEYWORDS = [
  "diagnosis",
  "prescription",
  "hiv",
  "cancer",
  "mental health",
  "therapy",
  "blood test result",
  "aadhaar",
  "abha",
  "patient",
];

// Force module inclusion to prevent tree-shaking
if (typeof window !== 'undefined') {
  console.log('[Sentry] Module loaded');
}

let initialized = false;

function containsPhi(text: string): boolean {
  const lowered = (text || "").toLowerCase();
  return PHI_KEYWORDS.some((k) => lowered.includes(k));
}

function scrubPhi(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return containsPhi(obj) ? "[REDACTED: PHI]" : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(scrubPhi);
  }
  if (typeof obj === "object") {
    const scrubbed: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      scrubbed[key] = scrubPhi(value);
    }
    return scrubbed;
  }
  return obj;
}

export function initSentry(): void {
  if (initialized) return;
  
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log("[Sentry] VITE_SENTRY_DSN not set; Sentry disabled");
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || "dev",
      integrations: [browserTracingIntegration()],
      beforeSend(event) {
        // Scrub PHI from exception values
        if (event.exception?.values) {
          for (const exc of event.exception.values) {
            if (exc.value && containsPhi(exc.value)) {
              exc.value = "[REDACTED: PHI]";
            }
            if (exc.stacktrace?.frames) {
              for (const frame of exc.stacktrace.frames) {
                if (frame.vars) {
                  frame.vars = scrubPhi(frame.vars);
                }
              }
            }
          }
        }

        // Scrub breadcrumbs
        if (event.breadcrumbs?.values) {
          const breadcrumbs = Array.from(event.breadcrumbs.values());
          for (const crumb of breadcrumbs) {
            if (crumb.data) {
              crumb.data = scrubPhi(crumb.data);
            }
            if (crumb.message && containsPhi(crumb.message)) {
              crumb.message = "[REDACTED: PHI]";
            }
          }
        }

        // Scrub contexts
        if (event.contexts) {
          event.contexts = scrubPhi(event.contexts);
        }

        // Scrub user
        if (event.user) {
          event.user = scrubPhi(event.user);
        }

        // Scrub tags
        if (event.tags) {
          event.tags = scrubPhi(event.tags);
        }

        // Final check: drop if PHI still present
        if (containsPhi(JSON.stringify(event))) {
          console.warn("[Sentry] Dropping event: PHI detected after scrubbing");
          return null;
        }

        return event;
      },
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
    });
    initialized = true;
    console.log("[Sentry] Initialized for environment:", import.meta.env.MODE);
  } catch (e) {
    console.error("[Sentry] Failed to initialize:", e);
  }
}

export function setSentryUser(userId: string, role: string, email?: string): void {
  if (!initialized) return;
  Sentry.setUser({
    id: userId,
    role,
    email: email && !containsPhi(email) ? email : undefined,
  });
}

export function clearSentryUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}

export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  if (!initialized) return;
  if (containsPhi(message)) {
    console.warn("[Sentry] Refused to capture message: PHI detected");
    return;
  }
  Sentry.captureMessage(message, level);
}

export function captureSentryException(error: Error, context?: Record<string, any>): void {
  if (!initialized) return;
  if (containsPhi(error.message)) {
    console.warn("[Sentry] Refused to capture exception: PHI detected");
    return;
  }
  Sentry.captureException(error, { extra: context ? scrubPhi(context) : undefined });
}

export function addSentryBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = "info",
  data?: Record<string, any>
): void {
  if (!initialized) return;
  if (containsPhi(message)) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: data ? scrubPhi(data) : undefined,
  });
}