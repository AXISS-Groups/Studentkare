import { registerModule } from '@/core/routing';
import type { FeatureModule, FeatureRoute } from '@/core/routing';
import React from 'react';
import { Navigate } from '@/core/navigation';
import type { AccountRole } from '@/data/types/workflowTypes';

const hasRole = (...roles: AccountRole[]) => (role: AccountRole | null): boolean => (role ? roles.includes(role) : false);

const workspacePaths: { path: string; access?: (role: AccountRole | null) => boolean; public?: boolean }[] = [
  { path: '/health' },
  { path: '/profile' },
  { path: '/billing' },
  { path: '/digital-id' },
  { path: '/records' },
  { path: '/insurance' },
  { path: '/orders' },
  { path: '/appointments' },
  { path: '/medications' },
  { path: '/health-camp' },
  { path: '/notifications' },
  { path: '/notification-settings' },
  // Sign-in & security, every role. A session held to 2FA set-up lands here.
  { path: '/security' },
  { path: '/leave-campus', access: hasRole('STUDENT') },
  // Invite friends, points and medals: student accounts only.
  { path: '/rewards', access: hasRole('STUDENT') },
  // Signed-in student web (canvas 3b): the home and Buy again. Partners keep /reorder.
  { path: '/home', access: hasRole('STUDENT') },
  { path: '/buy-again', access: hasRole('STUDENT') },
  // My lab tests and Report insights (canvas 3b, WP-09).
  { path: '/my-lab-tests', access: hasRole('STUDENT') },
  { path: '/report-insights', access: hasRole('STUDENT') },
  { path: '/care-navigator' },
  { path: '/preventive-care' },
  { path: '/report-reviews', access: hasRole('NMC_DOCTOR') },
  { path: '/earnings', access: hasRole('NMC_DOCTOR') },
  { path: '/chronic', access: hasRole('NMC_DOCTOR') },
  { path: '/support' },
  { path: '/movement' },
  { path: '/wellness-training' },
  { path: '/campus-wellness', access: hasRole('CAMPUS_ADMIN', 'SUPER_ADMIN') },
  { path: '/devices' },
  { path: '/clinical-notes', access: hasRole('NMC_DOCTOR', 'SUPER_ADMIN') },
  { path: '/prescriptions' },
  // A student's own signed visit notes; the server returns only the caller's.
  { path: '/visit-summaries' },
  { path: '/ayush' },
  { path: '/clinical-review', access: hasRole('NMC_DOCTOR', 'SUPER_ADMIN') },
  // Partner consoles. They were public (no sign-in at all); staff screens are
  // vendor/super-admin only, like /returns below (AGENTS.md guardrail 2).
  { path: '/dispensing', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/dispense-register', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-dispense-register', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-queue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-lab-queue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/scan-verify', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/catalogue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/run-sheet', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-collection', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/cold-chain', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-cold-chain', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/returns', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-returns', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/handover', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-handover', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/substitutions', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-substitutions', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/reorder', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-reorder', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/camp-intake', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-camp-intake', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/camp-fast', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-reporting', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/staff-verify', access: hasRole('VENDOR', 'SUPER_ADMIN', 'LAB_COLLECTOR') },
  { path: '/staff-handover', access: hasRole('VENDOR', 'SUPER_ADMIN', 'LAB_COLLECTOR') },
  { path: '/staff-collect', access: hasRole('VENDOR', 'SUPER_ADMIN', 'LAB_COLLECTOR') },
  { path: '/settlement', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/settlements', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-settlement', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/performance', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-console', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/console', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/rx-review', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-rx-review', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/staff', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/partner-staff', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-staff', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/staff-roles', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/admin', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/billing', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/catalog', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/accounts', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/requests', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/support', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/audit', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/integrations', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/telemetry', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/knowledge', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/intake', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/preventive', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/activity', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/ops', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/surveillance', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/flags', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/organisations', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/sentinel', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/tokens', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/verification', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/partners', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/plans', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/ledger', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/templates', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/rule-l', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/consent-policy', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/break-glass-log', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/checkins', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/handover', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/ai-governance', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/erasure', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/api-keys', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/case', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/price-fix', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/lab-reviews', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/claims', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/outbox', access: hasRole('SUPER_ADMIN') },
  { path: '/admin/team-accounts', access: hasRole('SUPER_ADMIN') },
  // Legal documents: the privacy notice, terms and grievance officer, versioned and published (audit H2).
  { path: '/admin/legal-documents', access: hasRole('SUPER_ADMIN') },
  // Find care near you: the curated directory listings (super admin: every campus).
  { path: '/admin/care-directory', access: hasRole('SUPER_ADMIN') },
  // Medicine information review: super admins edit and import; pharmacists (partner console) approve.
  { path: '/admin/medicine-info', access: hasRole('SUPER_ADMIN') },
  { path: '/medicine-info-review', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  // Posts (News and Blog): the super admin edits and publishes; clinicians review health tips.
  { path: '/admin/posts', access: hasRole('SUPER_ADMIN') },
  { path: '/clinician/post-reviews', access: hasRole('NMC_DOCTOR') },
  { path: '/delete-account', access: hasRole('STUDENT') },
  // The student's Your Care overview (the phone tab), account details and data export.
  { path: '/your-care', access: hasRole('STUDENT') },
  { path: '/account' },
  { path: '/data-export' },
  { path: '/my-requests', access: hasRole('STUDENT') },
  { path: '/return-request', access: hasRole('STUDENT') },
  { path: '/hostel-visit', access: hasRole('STUDENT') },
  { path: '/refill-request', access: hasRole('STUDENT') },
  // Mobile 2.0 My health (Tier 1): Trends and Add a lab report, on the student's own stored lab values.
  { path: '/health/trends', access: hasRole('STUDENT') },
  { path: '/health/report-upload', access: hasRole('STUDENT') },
  // Mobile 2.0 Medicines today and Water (reminders ticket): the student's own doses and water log.
  { path: '/health/medicines', access: hasRole('STUDENT') },
  { path: '/health/water', access: hasRole('STUDENT') },
  // Steps (Mobile 2.0, Tier 2): the student's own step totals; a browser counts none, typed entry only.
  { path: '/health/steps', access: hasRole('STUDENT') },
  // What's new (newsroom product update posts), opened from Profile.
  { path: '/whats-new', access: hasRole('STUDENT') },
  { path: '/vendor', access: hasRole('VENDOR') },
  { path: '/clinician', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/queue', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/lab-orders', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/referrals', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/renewals', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/patients', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/ayush', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/decision-support', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/schedule', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/inbox', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/consult-room', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/critical-results', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/report-reviews', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/encounter-note', access: hasRole('NMC_DOCTOR') },
  { path: '/clinician/prescribe', access: hasRole('NMC_DOCTOR') },
  { path: '/campus', access: hasRole('CAMPUS_ADMIN', 'SUPER_ADMIN') },
  // The campus console's boards (design page 4); one shell, see CampusConsole.
  ...['students', 'blocks', 'verification', 'leave', 'scorecard', 'insights', 'camps', 'certificates', 'sos', 'incidents', 'ambulance', 'care-directory', 'counsellor', 'isolation', 'discharge', 'outbreak', 'water', 'sanitary', 'mess', 'sla', 'team', 'announcements', 'reports', 'settings', 'aggregate']
    .map((board) => ({ path: `/campus/${board}`, access: hasRole('CAMPUS_ADMIN', 'SUPER_ADMIN') })),
  { path: '/campus-access-requests', access: hasRole('CAMPUS_ADMIN', 'SUPER_ADMIN') },
  { path: '/campus-break-glass', access: hasRole('CAMPUS_ADMIN', 'SUPER_ADMIN') },
  // Crisis follow-up: counsellors (own campus, server-scoped) and the super admin only.
  { path: '/counsellor', access: hasRole('COUNSELLOR', 'SUPER_ADMIN') },
  // Verify it's you (VerifyIdentity / WebVerify): in the student frame at every width.
  { path: '/verify' },
  { path: '/emergency-card' },
  // Tier 1 phone boards (WP-06): emergency contacts, the consent inbox and the care circle.
  { path: '/ice-contacts', access: hasRole('STUDENT') },
  { path: '/consent', access: hasRole('STUDENT') },
  // Privacy & consent and data rights (audit H2): the student's own consent ledger and rights.
  { path: '/privacy-consent', access: hasRole('STUDENT') },
  { path: '/data-rights', access: hasRole('STUDENT') },
  { path: '/care-circle', access: hasRole('STUDENT') },
  { path: '/pass' },
  // Phone search (design page 2: SearchEntry … DoctorResults). The catalogue is public; the boards need a session for booking.
  { path: '/search' },
];

/** True for a URL drawn by the member workspace (WorkspaceRouteScreen). */
export function isWorkspacePath(pathname: string): boolean {
  return workspacePaths.some((entry) => entry.path === pathname);
}

const LEGACY_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ['/vault', '/records'],
  ['/camp', '/health-camp'],
  ['/help', '/support'],
];

function redirectTo(to: string): React.ComponentType {
  const Redirect = () => React.createElement(Navigate, { to, replace: true });
  Redirect.displayName = `Redirect(${to})`;
  return Redirect;
}

// One loader shared by every workspace path. The router keys its lazy component by
// this function, so sharing it keeps the workspace (and the Super Admin shell) mounted
// between sections instead of remounting it, and its sidebar, on every click.
const loadWorkspace = () => import('./screens/WorkspaceRouteScreen').then((m) => ({ default: m.WorkspaceRouteScreen }));

const routes: FeatureRoute[] = [
  { path: '/pricing', public: true, load: () => import('@/screens/billing/PricingScreen').then((m) => ({ default: m.PricingScreen })) },
  ...workspacePaths.map(({ path, access, public: isPublic }) => ({
    path,
    access,
    public: isPublic,
    load: loadWorkspace,
  })),
  // Old or alternative URLs linked from the public site. Each used to fall
  // through to the dashboard overview; they now land on the screen they name.
  ...LEGACY_REDIRECTS.map(([path, to]) => ({
    path,
    load: () => Promise.resolve({ default: redirectTo(to) }),
  })),
];

export const healthModule: FeatureModule = {
  id: 'health',
  title: 'Student Health Workspace',
  basePath: '/',
  routes,
};

registerModule(healthModule);
