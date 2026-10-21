/**
 * Every path that renders inside the partner console shell, aliases included.
 * Kept free of UI imports: App.tsx reads it on every navigation.
 */
export const VENDOR_ROUTE_PATHS = [
  '/vendor',
  '/handover',
  '/vendor-handover',
  '/substitutions',
  '/vendor-substitutions',
  '/scan-verify', // the partner scanner; /verify is the student identity page
  '/returns',
  '/vendor-returns',
  '/catalogue',
  '/orders',
  '/run-sheet',
  '/lab-collection',
  '/cold-chain',
  '/lab-cold-chain',
  '/reorder',
  '/vendor-reorder',
  '/camp-intake',
  '/vendor-camp-intake',
  '/camp-fast', // the staff app's camp fast mode: full screen, no sidebar
  // The staff app's phone boards (WP-15): full screen, no sidebar.
  '/staff-verify',
  '/staff-handover',
  '/staff-collect',
  '/lab-reporting',
  '/lab-queue',
  '/vendor-lab-queue',
  '/dispensing',
  '/dispense-register',
  '/vendor-dispense-register',
  '/console',
  '/vendor-console',
  '/performance',
  '/settlement',
  '/settlements',
  '/vendor-settlement',
  '/rx-review',
  '/vendor-rx-review',
  '/partner-staff',
  '/staff',
  '/vendor-staff',
  '/staff-roles',
] as const;

export function isVendorPath(pathname: string): boolean {
  return VENDOR_ROUTE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
