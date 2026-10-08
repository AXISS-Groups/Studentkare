import { registerModule } from '@/core/routing';
import type { FeatureModule, FeatureRoute } from '@/core/routing';
import React from 'react';
import { Navigate } from '@/core/navigation';
import type { AccountRole } from '@/data/workflowTypes';

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
  { path: '/leave-campus', access: hasRole('STUDENT') },
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
  { path: '/ayush' },
  { path: '/clinical-review', access: hasRole('NMC_DOCTOR', 'SUPER_ADMIN') },
  // Partner consoles. They were public (no sign-in at all); staff screens are
  // vendor/super-admin only, like /returns below (AGENTS.md guardrail 2).
  { path: '/dispensing', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/dispense-register', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-dispense-register', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-queue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/vendor-lab-queue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/verify', access: hasRole('VENDOR', 'SUPER_ADMIN') },
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
  { path: '/delete-account', access: hasRole('STUDENT') },
  { path: '/my-requests', access: hasRole('STUDENT') },
  { path: '/return-request', access: hasRole('STUDENT') },
  { path: '/hostel-visit', access: hasRole('STUDENT') },
  { path: '/refill-request', access: hasRole('STUDENT') },
  { path: '/vendor', access: hasRole('VENDOR') },
  { path: '/clinician', access: hasRole('NMC_DOCTOR') },
  { path: '/campus', access: hasRole('CAMPUS_ADMIN', 'STUDENT', 'SUPER_ADMIN') },
  { path: '/campus-access-requests', access: hasRole('CAMPUS_ADMIN', 'STUDENT', 'SUPER_ADMIN') },
  { path: '/campus-break-glass', access: hasRole('CAMPUS_ADMIN', 'STUDENT', 'SUPER_ADMIN') },
  { path: '/emergency-card' },
  { path: '/pass' },
];

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
