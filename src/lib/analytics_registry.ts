/**
 * Studentkare — Typed Analytics Registry & Dark Surface Enforcement
 * Compliance: A-3.1 to A-3.4 Analytics Specification
 *
 * Rules:
 * - Analytics self-hosted in India region (ap-south-1).
 * - Closed event union (T0/T1 operational only; no T2+ events exist).
 * - DARK SURFACES: Crisis Gate, Emergency Card, T4 screens, Consent Capture, Helpline routing
 *   carry ZERO analytics instrumentation.
 */

export type AllowedAnalyticsEventName =
  | 'page_viewed_t0'
  | 'login_attempted'
  | 'record_added_t1'
  | 'consent_ledger_opened'
  | 'dpdp_request_submitted';

export interface AnalyticsEvent {
  name: AllowedAnalyticsEventName;
  tier: 'T0' | 'T1';
  properties?: {
    route?: string;
    tenantId?: string;
    actionSuccess?: boolean;
  };
}

export class AnalyticsTracker {
  private analyticsConsentGiven: boolean = false;

  setAnalyticsConsent(granted: boolean): void {
    this.analyticsConsentGiven = granted;
  }

  trackEvent(event: AnalyticsEvent, currentRoute: string): boolean {
    if (!this.analyticsConsentGiven) {
      return false; // Opt-in analytics consent default OFF
    }

    // STRICT DARK SURFACE ENFORCEMENT
    const isDarkSurface =
      currentRoute.includes('emergency') ||
      currentRoute.includes('crisis') ||
      currentRoute.includes('t4_sensitive') ||
      currentRoute.includes('helpline') ||
      currentRoute.includes('consent_capture');

    if (isDarkSurface) {
      console.warn(`[ANALYTICS_BLOCKED] Attempted analytics on dark surface route: ${currentRoute}`);
      return false;
    }

    console.log(`[ANALYTICS_EMIT] Event: ${event.name} (Tier: ${event.tier})`, event.properties);
    // Forward to PostHog when enabled + consented (itself dark-surface safe)
    import('./posthog').then((m) => m.posthogCapture(event.name, currentRoute, event.properties as any)).catch(() => {});
    return true;
  }
}

export const analyticsTracker = new AnalyticsTracker();
