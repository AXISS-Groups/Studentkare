import type { AccountRole } from '../../data/types/workflowTypes';
import { routePaths } from './routes/routePaths';
import { publicRoutes } from './routes/publicRoutes';
import { routePrefixRoles, routeRoles } from './routes/routeRoles';

// The route lists live in ./routes/, one entry per line, so parallel branches don't collide.
export { routePaths, publicRoutes };
export type RoutePath = typeof routePaths[number];
export const isRoutePath = (value: string): value is RoutePath => routePaths.includes(value as RoutePath);
export const asRoutePath = (value: string): RoutePath => (isRoutePath(value) ? value : ('shop' as RoutePath));
export const homeForRole = (role: AccountRole): RoutePath => role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : role === 'NMC_DOCTOR' ? 'clinician' : role === 'CAMPUS_ADMIN' ? 'campus' : role === 'COUNSELLOR' ? 'counsellor' : role === 'LAB_COLLECTOR' ? 'staff-collect' : 'health';
export function canAccessRoute(route: RoutePath, role: AccountRole | null) {
  if (publicRoutes.includes(route)) return true;
  if (!role) return false;
  // Every /admin… page is the super admin's, whatever ./routes/routeRoles.ts says.
  if (route.startsWith('admin')) return role === 'SUPER_ADMIN';
  const roles = Object.prototype.hasOwnProperty.call(routeRoles, route)
    ? routeRoles[route]
    : routePrefixRoles.find(([prefix]) => route.startsWith(prefix))?.[1];
  return roles ? roles.includes(role) : true;
}
export function readRoute() {
  const hashRaw = window.location.hash.replace(/^#\/?/, '');
  const pathRaw = hashRaw || window.location.pathname.replace(/^\//, '');
  const [path = '', search = ''] = pathRaw.split('?');
  const querySearch = search || window.location.search;
  const next = new URLSearchParams(querySearch).get('next') || '';
  return { path: asRoutePath(path), next: isRoutePath(next) && !publicRoutes.includes(next) ? next : null };
}

type NavigationListener = (path: string) => void;
let globalNavigator: NavigationListener | null = null;

export function registerGlobalNavigator(navigator: NavigationListener | null) {
  globalNavigator = navigator;
}

/**
 * Imperative navigation supporting clean URLs, React Router, and legacy hash links.
 * Updates clean pathname and invokes router navigator for seamless single-page transitions.
 */
export const navigate = (path: RoutePath, next?: RoutePath) => {
  const targetUrl = `/${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  if (globalNavigator) {
    globalNavigator(targetUrl);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
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

