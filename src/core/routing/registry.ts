import type { AccountRole } from '@/data/workflowTypes';

/** Route guard: true grants access for the given role (or anonymous). */
export type AccessCheck = (role: AccountRole | null) => boolean;

/** A route declaration registered by a feature module. */
export interface FeatureRoute {
  /** URL path segment, e.g. '/health' or '/admin/catalog'. */
  path: string;
  /** Route is reachable without a session. */
  public?: boolean;
  /** Role gate; omitted = any authenticated role. */
  access?: AccessCheck;
  /** Lazy component loader (React.lazy-compatible). */
  load: () => Promise<{ default: React.ComponentType }>;
  /** Nested routes owned by this feature (e.g. '/health/records'). */
  children?: FeatureRoute[];
}

/**
 * A feature module. Each domain (auth, health, claims, camp, chat, ...) is a
 * self-contained package owning its models, ViewModel(s), components, and
 * route declarations. The module registry is the single place features are
 * wired into the app shell.
 */
export interface FeatureModule {
  id: string;
  title: string;
  /** Top-level URL prefix, e.g. '/health'. */
  basePath: string;
  /** Routes owned by the module (rooted at basePath). */
  routes: FeatureRoute[];
  /** Providers the module needs mounted around its tree (optional). */
  providers?: React.ComponentType<{ children?: React.ReactNode }>[];
}

export const registry: FeatureModule[] = [];

export function registerModule(module: FeatureModule): void {
  if (registry.some((existing) => existing.id === module.id)) return;
  registry.push(module);
}

export function getModules(): FeatureModule[] {
  return registry;
}

export function getModuleById(id: string): FeatureModule | undefined {
  return registry.find((module) => module.id === id);
}

/** Resolve access for a path from all registered modules. */
export function resolveAccess(path: string, role: AccountRole | null): boolean {
  const flat = registry.flatMap((module) =>
    module.routes.map((route) => ({ ...route, fullPath: joinPath(module.basePath, route.path) }))
  );
  const match = flat.find((route) => route.fullPath === path);
  if (!match) return true;
  if (match.public) return true;
  if (!role) return false;
  return match.access ? match.access(role) : true;
}

export function isPublicPath(path: string): boolean {
  const flat = registry.flatMap((module) =>
    module.routes.map((route) => ({ ...route, fullPath: joinPath(module.basePath, route.path) }))
  );
  const match = flat.find((route) => route.fullPath === path);
  return match?.public ?? false;
}

export function joinPath(base: string, segment: string): string {
  if (segment.startsWith('/')) return segment;
  if (base === '/') return `/${segment}`;
  return `${base.replace(/\/$/, '')}/${segment.replace(/^\//, '')}`;
}
