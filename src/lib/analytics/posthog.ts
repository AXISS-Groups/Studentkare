/** Opt-in, anonymous event counts. No SDK auto-enrichment or stored identity. */
import { uuid4 } from '@sentry/core';

export interface PostHogPublicConfig {
  enabled: boolean;
  apiKey: string;
  host: string;
}

let cfg: PostHogPublicConfig = { enabled: false, apiKey: '', host: 'https://app.posthog.com' };
let consent = false;

// Only these existing, non-clinical events have a defined telemetry contract.
const PRICING_EVENTS = ['pricing_plan_selected', 'institutional_inquiry_submitted'] as const;
const PRICING_ROUTE = '/pricing';

export function configurePostHog(config: Partial<PostHogPublicConfig>): void {
  cfg = { ...cfg, ...config };
}

export function setPostHogConsent(granted: boolean): void {
  consent = granted;
}

export async function initPostHog(): Promise<boolean> {
  // SDK initialization can make unconsented requests and add URLs/device identity.
  // The existing HTTP capture API suffices for the approved event counts.
  return consent && cfg.enabled && Boolean(cfg.apiKey);
}

export function posthogCapture(event: string, route: string, _props?: Record<string, unknown>): boolean {
  if (!consent || !cfg.enabled || !cfg.apiKey || route !== PRICING_ROUTE) return false;
  const approvedEvent = PRICING_EVENTS.find((allowed) => allowed === event);
  if (!approvedEvent) return false;
  try {
    const host = cfg.host.replace(/\/$/, '');
    fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        api_key: cfg.apiKey,
        event: approvedEvent,
        properties: { route: PRICING_ROUTE, distinct_id: uuid4() },
      }),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
