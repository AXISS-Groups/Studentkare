import type { AccountRole } from '../data/workflowTypes';

export const routePaths = ['shop', 'care', 'checkout', 'login', 'signup', 'health', 'records', 'insurance', 'orders', 'appointments', 'medications', 'health-camp', 'notifications', 'care-navigator', 'preventive-care', 'report-reviews', 'support', 'movement', 'devices', 'clinical-notes', 'admin', 'admin/catalog', 'admin/accounts', 'admin/requests', 'admin/support', 'admin/audit', 'admin/integrations', 'admin/telemetry', 'admin/knowledge', 'admin/intake', 'admin/preventive', 'vendor', 'clinician', 'campus'] as const;
export type RoutePath = typeof routePaths[number];
export const publicRoutes: RoutePath[] = ['shop', 'care', 'login', 'signup'];
export const isRoutePath = (value: string): value is RoutePath => routePaths.includes(value as RoutePath);
export const asRoutePath = (value: string): RoutePath => (isRoutePath(value) ? value : ('shop' as RoutePath));
export const homeForRole = (role: AccountRole): RoutePath => role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : role === 'NMC_DOCTOR' ? 'clinician' : role === 'CAMPUS_ADMIN' ? 'campus' : 'health';
export function canAccessRoute(route: RoutePath, role: AccountRole | null) {
  if (publicRoutes.includes(route)) return true;
  if (!role) return false;
  if (route.startsWith('admin')) return role === 'SUPER_ADMIN';
  if (route === 'vendor') return role === 'VENDOR';
  if (route === 'clinician') return role === 'NMC_DOCTOR';
  if (route === 'clinical-notes') return role === 'NMC_DOCTOR' || role === 'SUPER_ADMIN';
  if (route === 'report-reviews') return role === 'NMC_DOCTOR';
  if (route === 'campus') return role === 'CAMPUS_ADMIN' || role === 'STUDENT' || role === 'SUPER_ADMIN';
  return true;
}
export function readRoute() {
  const hashRaw = window.location.hash.replace(/^#\/?/, '');
  const pathRaw = hashRaw || window.location.pathname.replace(/^\//, '');
  const [path = '', search = ''] = pathRaw.split('?');
  const querySearch = search || window.location.search;
  const next = new URLSearchParams(querySearch).get('next') || '';
  return { path: asRoutePath(path), next: isRoutePath(next) && !publicRoutes.includes(next) ? next : null };
}

/**
 * Imperative navigation shared by both the legacy hash router and the
 * react-router tree. Writes to the hash so a mounted HashRouter reacts to it;
 * module-level callers (e.g. logout) still work outside component context.
 */
export const navigate = (path: RoutePath, next?: RoutePath) => {
  const targetUrl = `/${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  if (window.location.hash !== `#${targetUrl}`) {
    window.location.hash = targetUrl;
  } else {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
};
