import { registerModule } from '@/core/routing';
import type { FeatureModule, FeatureRoute } from '@/core/routing';
import React from 'react';
import { Navigate } from '@/core/navigation';
import type { AccountRole } from '@/data/workflowTypes';

const hasRole = (...roles: AccountRole[]) => (role: AccountRole | null): boolean => (role ? roles.includes(role) : false);

const workspacePaths: { path: string; access?: (role: AccountRole | null) => boolean }[] = [
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
  { path: '/dispensing', access: hasRole('VENDOR', 'SUPER_ADMIN') },
  { path: '/lab-queue', access: hasRole('VENDOR', 'SUPER_ADMIN') },
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
  { path: '/admin/erasure', access: hasRole('SUPER_ADMIN') },
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

const routes: FeatureRoute[] = [
  { path: '/pricing', public: true, load: () => import('@/screens/billing/PricingScreen').then((m) => ({ default: m.PricingScreen })) },
  ...workspacePaths.map(({ path, access }) => ({
    path,
    access,
    load: () => import('./screens/WorkspaceRouteScreen').then((m) => ({ default: m.WorkspaceRouteScreen })),
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
