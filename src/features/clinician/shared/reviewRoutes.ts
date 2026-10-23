import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * Where the doctor's clinical screens live. The Tier 1 screens (WP-13) were
 * approved by Krishna Chintakayala on 2026-10-21 and are live in every build;
 * the older panels (`clinical-review`, `report-reviews`, `clinical-notes`)
 * stay reachable for links that still point at them, and `clinical-review`
 * keeps the held-report release and substitution decisions the critical
 * results board does not cover.
 */
export const REVIEW_ROUTES = {
  inbox: (): RoutePath => 'clinician/inbox',
  consultRoom: (): RoutePath => 'clinician/consult-room',
  criticalResults: (): RoutePath => 'clinician/critical-results',
  reportReviews: (): RoutePath => 'clinician/report-reviews',
  encounterNote: (): RoutePath => 'clinician/encounter-note',
  prescribe: (): RoutePath => 'clinician/prescribe',
} as const;
