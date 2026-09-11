import type { AccountRole } from '../data/workflowTypes';

export const routePaths = ['shop', 'care', 'checkout', 'login', 'signup', 'health', 'records', 'insurance', 'orders', 'support', 'movement', 'admin', 'admin/catalog', 'admin/accounts', 'admin/requests', 'admin/support', 'admin/audit', 'admin/integrations', 'vendor', 'clinician', 'campus'] as const;
export type RoutePath = typeof routePaths[number];
export const publicRoutes: RoutePath[] = ['shop', 'care', 'login', 'signup'];
export const isRoutePath = (value: string): value is RoutePath => routePaths.includes(value as RoutePath);
export const homeForRole = (role: AccountRole): RoutePath => role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : role === 'NMC_DOCTOR' ? 'clinician' : role === 'CAMPUS_ADMIN' ? 'campus' : 'health';
export function canAccessRoute(route: RoutePath, role: AccountRole | null) {
  if (publicRoutes.includes(route)) return true;
  if (!role) return false;
  if (route.startsWith('admin')) return role === 'SUPER_ADMIN';
  if (route === 'vendor') return role === 'VENDOR';
  if (route === 'clinician') return role === 'NMC_DOCTOR';
  if (route === 'campus') return role === 'CAMPUS_ADMIN';
  return true;
}
export function readRoute() {
  const [path = '', search = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const next = new URLSearchParams(search).get('next') || '';
  return { path: isRoutePath(path) ? path : 'shop' as RoutePath, next: isRoutePath(next) && !publicRoutes.includes(next) ? next : null };
}
export const navigate = (path: RoutePath, next?: RoutePath) => {
  window.location.hash = `/${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  window.scrollTo({ top: 0, behavior: 'instant' });
};
