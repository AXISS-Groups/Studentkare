import type { AccountRole } from '../../../data/types/workflowTypes';
import type { RoutePath } from '../workflowRouting';

/**
 * Who may open a route, for canAccessRoute (sign-in return targets, sidebar links).
 * RouteGuard enforces the feature-module registry; src/core/routing/__tests__/routeParity.test.ts
 * keeps the two in agreement. A route that is not listed here (and matches no prefix rule) is
 * open to every signed-in role; /admin… is the super admin's (workflowRouting.ts).
 *
 * One route per line, sorted: a ticket adds one line, so parallel branches merge cleanly
 * (git's union driver, .gitattributes). Keep this file a pure list.
 */
export type RouteRoles = readonly AccountRole[];

const CAMPUS_STAFF: RouteRoles = ['CAMPUS_ADMIN', 'SUPER_ADMIN'];
const CLINICIAN: RouteRoles = ['NMC_DOCTOR'];
const CLINICIAN_OR_ADMIN: RouteRoles = ['NMC_DOCTOR', 'SUPER_ADMIN'];
const COUNSELLOR_DESK: RouteRoles = ['COUNSELLOR', 'SUPER_ADMIN'];
const MEO_TRIAGE: RouteRoles = ['CAMPUS_ADMIN', 'NMC_DOCTOR', 'SUPER_ADMIN'];
const PARTNER: RouteRoles = ['VENDOR', 'SUPER_ADMIN'];
const STUDENT_ONLY: RouteRoles = ['STUDENT'];
const VENDOR_ONLY: RouteRoles = ['VENDOR'];

/** Every route under these prefixes (checked after the exact routes below). */
export const routePrefixRoles: readonly (readonly [prefix: string, roles: RouteRoles])[] = [
  // keep-sorted start
  ['campus/', CAMPUS_STAFF], // every page-4 campus board
  ['clinician/', CLINICIAN],
  ['health/', STUDENT_ONLY], // Mobile 2.0 My health (M2Trends, M2ReportUpload): the student's own lab values
  // keep-sorted end
];

/** Exact routes. */
export const routeRoles: Readonly<Partial<Record<RoutePath, RouteRoles>>> = {
  // keep-sorted start
  'buy-again': STUDENT_ONLY, // canvas 3b; /reorder is the partner console page
  'camp-fast': PARTNER,
  'camp-intake': PARTNER,
  'campus': CAMPUS_STAFF, // the campus console: campus administrators and the super admin
  'campus-access-requests': CAMPUS_STAFF,
  'campus-break-glass': CAMPUS_STAFF,
  'campus-wellness': CAMPUS_STAFF,
  'care-circle': STUDENT_ONLY,
  'catalogue': PARTNER,
  'chronic': CLINICIAN,
  'clinical-notes': CLINICIAN_OR_ADMIN,
  'clinical-review': CLINICIAN_OR_ADMIN,
  'clinician': CLINICIAN,
  'cold-chain': PARTNER,
  'consent': STUDENT_ONLY,
  'console': PARTNER,
  'counsellor': COUNSELLOR_DESK, // crisis follow-up queue (names, contacts): counsellors, campus-scoped by the server
  'delete-account': STUDENT_ONLY,
  'dispense-register': PARTNER,
  'dispensing': PARTNER,
  'earnings': CLINICIAN,
  'handover': PARTNER,
  'home': STUDENT_ONLY, // the signed-in student web home (canvas 3b)
  'hostel-visit': STUDENT_ONLY,
  'ice-contacts': STUDENT_ONLY,
  'lab-cold-chain': PARTNER,
  'lab-collection': PARTNER,
  'lab-queue': PARTNER,
  'lab-reporting': PARTNER,
  'leave-campus': STUDENT_ONLY,
  'meo': MEO_TRIAGE, // features/care/module.ts
  'my-lab-tests': STUDENT_ONLY, // the student's own released reports (WP-09)
  'my-requests': STUDENT_ONLY,
  'partner-staff': PARTNER,
  'performance': PARTNER,
  'refill-request': STUDENT_ONLY,
  'reorder': PARTNER,
  'report-insights': STUDENT_ONLY,
  'report-reviews': CLINICIAN,
  'return-request': STUDENT_ONLY,
  'returns': PARTNER,
  'rewards': STUDENT_ONLY, // invite codes, points and medals: the server refuses other roles
  'run-sheet': PARTNER,
  'rx-review': PARTNER,
  'scan-verify': PARTNER,
  'set-passcode': STUDENT_ONLY, // the student's own passcode (Account ready, Sign-in & security, forgot passcode)
  'settlement': PARTNER,
  'settlements': PARTNER,
  'staff': PARTNER,
  'staff-collect': PARTNER,
  'staff-handover': PARTNER,
  'staff-roles': PARTNER,
  'staff-verify': PARTNER,
  'substitutions': PARTNER,
  'vendor': VENDOR_ONLY,
  'vendor-camp-intake': PARTNER,
  'vendor-console': PARTNER,
  'vendor-dispense-register': PARTNER,
  'vendor-handover': PARTNER,
  'vendor-lab-queue': PARTNER,
  'vendor-reorder': PARTNER,
  'vendor-returns': PARTNER,
  'vendor-rx-review': PARTNER,
  'vendor-settlement': PARTNER,
  'vendor-staff': PARTNER,
  'vendor-substitutions': PARTNER,
  'your-care': STUDENT_ONLY, // the student's own overview (the phone tab)
  // keep-sorted end
};
