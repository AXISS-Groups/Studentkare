import { registerModule } from '@/core/routing';
import type { FeatureModule, FeatureRoute } from '@/core/routing';
import type { AccountRole } from '@/data/workflowTypes';

const hasRole = (...roles: AccountRole[]) => (role: AccountRole | null): boolean => (role ? roles.includes(role) : false);

const workspacePaths: { path: string; access?: (role: AccountRole | null) => boolean }[] = [
  { path: '/health' },
  { path: '/profile' },
  { path: '/digital-id' },
  { path: '/records' },
  { path: '/insurance' },
  { path: '/orders' },
  { path: '/appointments' },
  { path: '/medications' },
  { path: '/health-camp' },
  { path: '/notifications' },
  { path: '/care-navigator' },
  { path: '/preventive-care' },
  { path: '/report-reviews', access: hasRole('NMC_DOCTOR') },
  { path: '/support' },
  { path: '/movement' },
  { path: '/devices' },
  { path: '/clinical-notes', access: hasRole('NMC_DOCTOR', 'SUPER_ADMIN') },
  { path: '/admin', access: hasRole('SUPER_ADMIN') },
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
  { path: '/vendor', access: hasRole('VENDOR') },
  { path: '/clinician', access: hasRole('NMC_DOCTOR') },
  { path: '/campus', access: hasRole('CAMPUS_ADMIN', 'STUDENT', 'SUPER_ADMIN') },
];

const routes: FeatureRoute[] = workspacePaths.map(({ path, access }) => ({
  path,
  access,
  load: () => import('./screens/WorkspaceRouteScreen').then((m) => ({ default: m.WorkspaceRouteScreen })),
}));

export const healthModule: FeatureModule = {
  id: 'health',
  title: 'Student Health Workspace',
  basePath: '/',
  routes,
};

registerModule(healthModule);
