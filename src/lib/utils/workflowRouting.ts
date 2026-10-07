import type { AccountRole } from '../../data/workflowTypes';

export const routePaths = ['landing', 'campuses', 'clinicians', 'partnerships', 'lab-tests', 'privacy', 'terms', 'shop', 'care', 'checkout', 'pricing', 'login', 'signup', 'welcome', 'logged-out', 'profile-setup', 'permissions', 'account-ready', 'billing', 'health', 'profile', 'digital-id', 'records', 'insurance', 'orders', 'appointments', 'medications', 'health-camp', 'notifications', 'care-navigator', 'preventive-care', 'report-reviews', 'earnings', 'chronic', 'support', 'movement', 'wellness', 'campus-wellness', 'devices', 'clinical-notes', 'lifeshare', 'medical-incident', 'meo', 'admin', 'admin/billing', 'admin/catalog', 'admin/accounts', 'admin/requests', 'admin/support', 'admin/audit', 'admin/integrations', 'admin/telemetry', 'admin/knowledge', 'admin/intake', 'admin/preventive', 'admin/activity', 'admin/ops', 'admin/surveillance', 'admin/flags', 'admin/organisations', 'admin/sentinel', 'admin/tokens', 'admin/verification', 'admin/partners', 'admin/plans', 'admin/ledger', 'admin/templates', 'admin/rule-l', 'admin/consent-policy', 'admin/break-glass-log', 'admin/checkins', 'admin/handover', 'admin/ai-governance', 'admin/erasure', 'admin/api-keys', 'admin/case', 'admin/price-fix', 'vendor', 'clinician', 'campus', 'campus-access-requests', 'campus-break-glass', 'prescriptions', 'ayush', 'clinical-review', 'dispensing', 'dispense-register', 'vendor-dispense-register', 'lab-queue', 'vendor-lab-queue', 'verify', 'catalogue', 'run-sheet', 'lab-collection', 'cold-chain', 'lab-cold-chain', 'returns', 'vendor-returns', 'handover', 'vendor-handover', 'substitutions', 'vendor-substitutions', 'reorder', 'vendor-reorder', 'camp-intake', 'vendor-camp-intake', 'settlement', 'settlements', 'vendor-settlement', 'performance', 'vendor-console', 'console', 'rx-review', 'vendor-rx-review', 'staff', 'partner-staff', 'vendor-staff', 'staff-roles', 'emergency-card', 'pass'] as const;
export type RoutePath = typeof routePaths[number];
export const publicRoutes: RoutePath[] = ['landing', 'campuses', 'clinicians', 'partnerships', 'lab-tests', 'privacy', 'terms', 'shop', 'care', 'pricing', 'login', 'signup', 'welcome', 'logged-out', 'handover', 'vendor-handover', 'substitutions', 'vendor-substitutions', 'reorder', 'vendor-reorder', 'camp-intake', 'vendor-camp-intake', 'lab-queue', 'vendor-lab-queue', 'dispensing', 'dispense-register', 'vendor-dispense-register', 'settlement', 'settlements', 'vendor-settlement', 'performance', 'vendor-console', 'console', 'rx-review', 'vendor-rx-review', 'staff', 'partner-staff', 'vendor-staff', 'staff-roles'];
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
  if (route === 'campus-wellness') return role === 'CAMPUS_ADMIN' || role === 'SUPER_ADMIN';
  if (route === 'clinical-review') return role === 'NMC_DOCTOR' || role === 'SUPER_ADMIN';
  if (route === 'dispensing' || route === 'dispense-register' || route === 'vendor-dispense-register' || route === 'lab-queue' || route === 'vendor-lab-queue' || route === 'verify' || route === 'catalogue' || route === 'run-sheet' || route === 'lab-collection' || route === 'cold-chain' || route === 'lab-cold-chain' || route === 'returns' || route === 'vendor-returns' || route === 'handover' || route === 'vendor-handover' || route === 'substitutions' || route === 'vendor-substitutions' || route === 'reorder' || route === 'vendor-reorder' || route === 'camp-intake' || route === 'vendor-camp-intake' || route === 'settlement' || route === 'settlements' || route === 'vendor-settlement' || route === 'performance' || route === 'vendor-console' || route === 'console' || route === 'rx-review' || route === 'vendor-rx-review' || route === 'staff' || route === 'partner-staff' || route === 'vendor-staff' || route === 'staff-roles') return role === 'VENDOR' || role === 'SUPER_ADMIN';
  if (route === 'campus' || route === 'campus-access-requests' || route === 'campus-break-glass') return role === 'CAMPUS_ADMIN' || role === 'STUDENT' || role === 'SUPER_ADMIN';
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

