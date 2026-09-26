import type { AccountRole } from '../../data/workflowTypes';

export const routePaths = ['landing', 'campuses', 'clinicians', 'partnerships', 'lab-tests', 'privacy', 'terms', 'shop', 'care', 'checkout', 'pricing', 'login', 'signup', 'welcome', 'logged-out', 'profile-setup', 'permissions', 'account-ready', 'billing', 'health', 'profile', 'digital-id', 'records', 'insurance', 'orders', 'appointments', 'medications', 'health-camp', 'notifications', 'care-navigator', 'preventive-care', 'report-reviews', 'earnings', 'chronic', 'support', 'movement', 'devices', 'clinical-notes', 'lifeshare', 'medical-incident', 'meo', 'admin', 'admin/billing', 'admin/catalog', 'admin/accounts', 'admin/requests', 'admin/support', 'admin/audit', 'admin/integrations', 'admin/telemetry', 'admin/knowledge', 'admin/intake', 'admin/preventive', 'admin/activity', 'vendor', 'clinician', 'campus', 'prescriptions', 'ayush', 'clinical-review', 'dispensing', 'lab-queue'] as const;
export type RoutePath = typeof routePaths[number];
export const publicRoutes: RoutePath[] = ['landing', 'campuses', 'clinicians', 'partnerships', 'lab-tests', 'privacy', 'terms', 'shop', 'care', 'pricing', 'login', 'signup', 'welcome', 'logged-out'];
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
  if (route === 'earnings') return role === 'NMC_DOCTOR';
  if (route === 'chronic') return role === 'NMC_DOCTOR';
  if (route === 'clinical-review') return role === 'NMC_DOCTOR' || role === 'SUPER_ADMIN';
  if (route === 'dispensing' || route === 'lab-queue') return role === 'VENDOR' || role === 'SUPER_ADMIN';
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
 * Imperative navigation supporting clean URLs and legacy hash links.
 * Updates clean pathname and populates popstate events for seamless routing.
 */
export const navigate = (path: RoutePath, next?: RoutePath) => {
  const targetUrl = `/${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  if (window.location.hash) {
    window.location.hash = targetUrl;
  } else if (window.location.pathname !== `/${path}`) {
    window.history.pushState(null, '', targetUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
};
