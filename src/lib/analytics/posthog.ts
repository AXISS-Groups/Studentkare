/**
 * StudentKare — PostHog wrapper (opt-in, dark-surface safe).
 * Config comes from GET /api/config/public (SuperAdmin-configurable).
 * If posthog-js is not installed / not enabled, all calls are no-ops.
 */
import type { PostHog } from 'posthog-js';

export interface PostHogPublicConfig {
  enabled: boolean;
  apiKey: string;
  host: string;
}

let cfg: PostHogPublicConfig = { enabled: false, apiKey: '', host: 'https://app.posthog.com' };
let loaded = false;
let client: Pick<PostHog, 'capture' | 'identify'> | null = null;
let consent = false;

const DARK = ['emergency', 'crisis', 't4_sensitive', 'helpline', 'consent_capture'];

export function configurePostHog(c: Partial<PostHogPublicConfig>) {
  cfg = { ...cfg, ...c } as PostHogPublicConfig;
}

export function setPostHogConsent(granted: boolean) {
  consent = granted;
}

export async function initPostHog() {
  if (loaded || !cfg.enabled || !cfg.apiKey) return;
  loaded = true;
  try {
    const mod = await import('posthog-js').catch(() => null);
    const ph = mod?.default;
    if (ph) {
      ph.init(cfg.apiKey, {
        api_host: cfg.host || 'https://app.posthog.com',
        autocapture: false,
        capture_pageview: false,
        persistence: 'localStorage',
      });
      client = ph;
    }
  } catch {
    client = null;
  }
}

function darkSurface(route: string) {
  return DARK.some((d) => route.includes(d));
}

export function posthogCapture(event: string, route: string, props?: Record<string, unknown>) {
  if (!consent || !cfg.enabled) return false;
  if (darkSurface(route)) {
    console.warn(`[POSTHOG_BLOCKED] dark surface: ${route}`);
    return false;
  }
  try {
    if (client) {
      client.capture(event, { route, ...props });
    } else {
      // Server-side relay fallback: direct /capture call (no SDK needed)
      const host = (cfg.host || 'https://app.posthog.com').replace(/\/$/, '');
      fetch(`${host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: cfg.apiKey, event, properties: { route, ...(props || {}) } }),
      }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

export function posthogIdentify(userId: string, traits?: Record<string, unknown>) {
  try {
    client?.identify?.(userId, traits);
  } catch { /* noop */ }
}
