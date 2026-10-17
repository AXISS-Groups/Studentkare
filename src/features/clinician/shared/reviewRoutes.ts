import { demoDataEnabled } from '@/core/env';
import type { RoutePath } from '@/lib/workflowRouting';

/**
 * Screens built from the canvas but still awaiting a named design reviewer and
 * clinical sign-off (DESIGN.md §5, Tier 1). Development opens the new screen;
 * production keeps what it has today — the live screen, or nothing.
 */
export function reviewRoute(live: RoutePath | null, preview: RoutePath): RoutePath | null {
  return demoDataEnabled() ? preview : live;
}

export const REVIEW_ROUTES = {
  // Built from the design and live everywhere, empty until a source is connected.
  inbox: (): RoutePath => 'clinician/inbox',
  consultRoom: (): RoutePath => 'clinician/consult-room',
  criticalResults: () => reviewRoute('clinical-review', 'clinician/critical-results'),
  reportReviews: () => reviewRoute('report-reviews', 'clinician/report-reviews'),
  encounterNote: () => reviewRoute('clinical-notes', 'clinician/encounter-note'),
  // Tier 1: live as a read-only empty layout (like the Super Admin Tier 1 screens).
  prescribe: (): RoutePath => 'clinician/prescribe',
} as const;
