/**
 * Paths that render inside the clinician console shell for a doctor. Kept free of
 * UI imports: App.tsx reads it on every navigation to keep the shell mounted.
 *
 * `report-reviews`, `clinical-review` and `clinical-notes` are the production
 * targets of three sidebar items; they used to open in the member workspace,
 * with a different sidebar, and are now drawn inside the console too.
 */
// `/notifications` and `/support` are the shell's top-bar and footer links; other
// roles open them in their own workspace, which this key does not change.
const CLINICIAN_CONSOLE_PATHS = ['/clinician', '/earnings', '/chronic', '/report-reviews', '/clinical-review', '/clinical-notes', '/notifications', '/support'] as const;

export function isClinicianConsolePath(pathname: string): boolean {
  return CLINICIAN_CONSOLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
