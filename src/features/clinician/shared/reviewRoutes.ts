import { isDev } from '@/core/env';
import type { RoutePath } from '@/lib/workflowRouting';

/**
 * Screens built from the canvas but still awaiting a named design reviewer and
 * clinical sign-off (DESIGN.md §5, Tier 1). Development opens the new screen;
 * production keeps what it has today — the live screen, or nothing.
 */
export function reviewRoute(live: RoutePath | null, preview: RoutePath): RoutePath | null {
  return isDev() ? preview : live;
}

export const REVIEW_ROUTES = {
  inbox: () => reviewRoute(null, 'clinician/inbox'),
  consultRoom: () => reviewRoute(null, 'clinician/consult-room'),
  criticalResults: () => reviewRoute('clinical-review', 'clinician/critical-results'),
  reportReviews: () => reviewRoute('report-reviews', 'clinician/report-reviews'),
  encounterNote: () => reviewRoute('clinical-notes', 'clinician/encounter-note'),
  prescribe: () => reviewRoute(null, 'clinician/prescribe'),
} as const;
