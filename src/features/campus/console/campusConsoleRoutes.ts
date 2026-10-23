/**
 * Paths drawn inside the campus console shell for a campus administrator (or
 * the super admin). Kept free of UI imports: App.tsx reads it on every
 * navigation to keep the shell mounted between boards.
 *
 * `/campus-wellness`, `/campus-access-requests` and `/campus-break-glass` are
 * older URLs for three boards; they keep working and now open in the console.
 */
export const CAMPUS_CONSOLE_PATHS = ['/campus', '/campus-wellness', '/campus-access-requests', '/campus-break-glass'] as const;

/** The shell's top-bar and footer links; other roles open them in their own workspace. */
export const CAMPUS_SHARED_PATHS = ['/notifications', '/support'] as const;

export function isCampusConsolePath(pathname: string): boolean {
  return CAMPUS_CONSOLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** True when this signed-in role sees `pathname` inside the campus console. */
export function opensInCampusConsole(pathname: string, role: string | null): boolean {
  if (role === 'CAMPUS_ADMIN') return isCampusConsolePath(pathname) || CAMPUS_SHARED_PATHS.some((path) => pathname === path);
  // The super admin reaches campus boards from Operations; its own notifications and help stay in its console.
  if (role === 'SUPER_ADMIN') return isCampusConsolePath(pathname);
  return false;
}
