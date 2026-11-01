import { describe, expect, it } from 'vitest';
import { getModules, joinPath } from '@/core/routing/registry';
import type { FeatureRoute } from '@/core/routing/registry';
import { homeForRole } from '@/lib/utils/workflowRouting';
import { ACCOUNT_ROLES } from '@/data/types/workflowTypes';
import type { AccountRole } from '@/data/types/workflowTypes';
// The same five registrations App.tsx makes, by the same side-effect imports.
import '@/features/auth/module';
import '@/features/landing/module';
import '@/features/care/module';
import '@/features/health/module';
import '@/features/dev/module';

/**
 * Route ownership baseline (standardisation plan, phase 0).
 *
 * For every path the feature modules register, records which module owns it,
 * which page component its lazy loader resolves to, and what each visitor gets
 * from RouteGuard (src/app/Router.tsx): the page, a sign-in redirect,
 * or a redirect to their role's home. The result is committed as
 * __snapshots__/routeOwnership.txt; a migration that changes who owns a route,
 * or who may open it, changes that file and has to be reviewed as such.
 *
 * Not covered here, because it cannot be read without rendering the page (see
 * the phase 0 report): the second dispatch inside some entry pages. For
 * example, WorkspaceRouteScreen picks the clinician console, the campus console
 * or WorkspaceScreen from the route and the role, and WorkspaceScreen then
 * switches on the route again. Those entries show as the entry component only.
 */

type Visitor = AccountRole | 'anonymous';
const VISITORS: readonly Visitor[] = ['anonymous', ...ACCOUNT_ROLES];

interface RegisteredRoute {
  path: string;
  moduleId: string;
  route: FeatureRoute;
}

function registeredRoutes(): RegisteredRoute[] {
  const out: RegisteredRoute[] = [];
  const walk = (routes: FeatureRoute[], base: string, moduleId: string): void => {
    for (const route of routes) {
      const path = joinPath(base, route.path);
      out.push({ path, moduleId, route });
      if (route.children) walk(route.children, path, moduleId);
    }
  };
  for (const module of getModules()) walk(module.routes, module.basePath, module.id);
  return out;
}

/** What RouteGuard does for this visitor, before any 2FA set-up redirect. */
function outcome(route: FeatureRoute, visitor: Visitor): string {
  if (route.public) return 'page';
  if (visitor === 'anonymous') return 'login';
  if (route.access && !route.access(visitor)) return `home:/${homeForRole(visitor)}`;
  return 'page';
}

/** The name React shows for a component, looking through memo/observer and forwardRef wrappers. */
function componentName(component: unknown): string {
  if (typeof component === 'function') {
    const named: { displayName?: string; name?: string } = component;
    return named.displayName || named.name || '(anonymous function)';
  }
  if (typeof component === 'object' && component !== null) {
    const wrapper: { displayName?: unknown; type?: unknown; render?: unknown } = component;
    if (typeof wrapper.displayName === 'string' && wrapper.displayName) return wrapper.displayName;
    if (wrapper.type !== undefined) return componentName(wrapper.type);
    if (wrapper.render !== undefined) return componentName(wrapper.render);
  }
  return '(unknown)';
}

async function ownerOf(route: FeatureRoute): Promise<string> {
  try {
    const loaded = await route.load();
    return componentName(loaded.default);
  } catch (error) {
    return `LOAD FAILED: ${error instanceof Error ? error.message : String(error)}`;
  }
}

describe('route ownership', () => {
  const routes = registeredRoutes();

  it('covers the whole registry', () => {
    expect(routes.length).toBeGreaterThan(150);
  });

  it('matches the recorded baseline', async () => {
    const lines: string[] = [
      `# Route ownership: one line per registered path, in registry order.`,
      `# path | module | page component | ${VISITORS.join(' ')}`,
      `# page = renders the page; login = redirect to /login?next=…; home:/x = redirect to that role's home.`,
    ];
    for (const { path, moduleId, route } of routes) {
      const owner = await ownerOf(route);
      const access = VISITORS.map((visitor) => outcome(route, visitor)).join(' ');
      lines.push(`${path} | ${moduleId} | ${owner} | ${access}`);
    }
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('./__snapshots__/routeOwnership.txt');
  }, 300_000);

  it('resolves every route to a named page component', async () => {
    const unresolved: string[] = [];
    for (const { path, route } of routes) {
      const owner = await ownerOf(route);
      if (owner.startsWith('LOAD FAILED') || owner.startsWith('(')) unresolved.push(`${path}: ${owner}`);
    }
    expect(unresolved).toEqual([]);
  }, 300_000);
});
