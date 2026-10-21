import { describe, expect, it } from 'vitest';
import { getModules, joinPath, resolveAccess } from '../registry';
import type { FeatureRoute } from '../registry';
import { canAccessRoute, isRoutePath, publicRoutes } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { AccountRole } from '@/data/types/workflowTypes';
import '@/features/auth/module';
import '@/features/landing/module';
import '@/features/care/module';
import '@/features/health/module';

// RouteGuard enforces the registry; canAccessRoute decides sign-in return targets and
// sidebar links. They are kept by hand (the native app has no registry), so this holds
// them together. Only registered paths that are also RoutePaths are compared: `/`, the
// landing-only pages, the legacy redirects and /dev/icons are not RoutePaths and
// canAccessRoute never sees them.
const ROLES: AccountRole[] = ['STUDENT', 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR'];

// Public in the registry so a signed-out visitor still gets help, but not sign-in pages:
// canAccessRoute(route, null) is false for them, which no caller relies on.
const PUBLIC_NOT_IN_PUBLIC_ROUTES: RoutePath[] = ['sos', 'lifeshare', 'medical-incident', 'lost-phone'];

function registered(): { route: RoutePath; isPublic: boolean }[] {
  const out: { route: RoutePath; isPublic: boolean }[] = [];
  const walk = (routes: FeatureRoute[], base: string) => routes.forEach((entry) => {
    const full = joinPath(base, entry.path);
    const route = full.replace(/^\//, '');
    if (isRoutePath(route)) out.push({ route, isPublic: !!entry.public });
    if (entry.children) walk(entry.children, full);
  });
  getModules().forEach((module) => walk(module.routes, module.basePath));
  return out;
}

describe('route permissions: canAccessRoute agrees with the registry', () => {
  it('compares a meaningful share of the route table', () => {
    expect(registered().length).toBeGreaterThan(150);
  });

  it.each(ROLES)('gives a signed-in %s the same answer as RouteGuard for every route', (role) => {
    const disagreements = registered()
      .filter(({ route }) => canAccessRoute(route, role) !== resolveAccess(`/${route}`, role))
      .map(({ route }) => `${route}: canAccessRoute ${canAccessRoute(route, role)}, registry ${resolveAccess(`/${route}`, role)}`);
    expect(disagreements).toEqual([]);
  });

  it('lists as public only routes the registry serves without a session', () => {
    const table = new Map(registered().map(({ route, isPublic }) => [route, isPublic]));
    expect(publicRoutes.filter((route) => table.get(route) !== true)).toEqual([]);
  });

  it('leaves out of publicRoutes only the known signed-out help pages', () => {
    const missing = registered().filter(({ route, isPublic }) => isPublic && !publicRoutes.includes(route)).map(({ route }) => route);
    expect(missing.sort()).toEqual([...PUBLIC_NOT_IN_PUBLIC_ROUTES].sort());
  });
});
