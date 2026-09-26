import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from '@/core/navigation';
import { getModules, resolveAccess, joinPath } from './registry';
import type { FeatureRoute } from './registry';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { useAuth } from '@/data/AuthContext';
import { homeForRole } from '@/lib/workflowRouting';

// Keep lazy identities and their resolved promises across shell/auth rerenders.
const components = new WeakMap<FeatureRoute['load'], React.LazyExoticComponent<React.ComponentType>>();

function componentFor(load: FeatureRoute['load']) {
  let component = components.get(load);
  if (!component) {
    component = React.lazy(load);
    components.set(load, component);
  }
  return component;
}

function renderFeatureRoutes(routes: FeatureRoute[], basePath: string): React.ReactNode {
  return routes.map((route) => {
    const full = joinPath(basePath, route.path);
    const Component = componentFor(route.load);
    const guard = (element: React.ReactNode) => (
      <RouteGuard access={route.access} public={route.public}>
        {element}
      </RouteGuard>
    );
    return (
      <Route
        key={full}
        path={full}
        element={
          guard(
            <Suspense fallback={<ScreenLoading />}>
              <Component />
            </Suspense>
          )
        }
      >
        {route.children ? renderFeatureRoutes(route.children, full) : null}
      </Route>
    );
  });
}

/** Wait for a checked session before deciding access; never mirror auth into globals. */
function RouteGuard({
  access,
  public: isPublic,
  children,
}: {
  access?: (role: import('@/data/workflowTypes').AccountRole | null) => boolean;
  public?: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const auth = useAuth();
  if (isPublic) return <>{children}</>;
  if (auth.status === 'loading') return <ScreenLoading />;
  if (auth.status === 'error') {
    return <section className="wf-state" role="alert">
      <h2>Your session could not be checked.</h2>
      <p>{auth.error}</p>
      <button className="health-button" onClick={auth.refresh}>Retry session check</button>
    </section>;
  }
  if (!auth.user) {
    const next = location.pathname.replace(/^\//, '');
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (access && !access(auth.user.role)) {
    return <Navigate to={`/${homeForRole(auth.user.role)}`} replace />;
  }
  return <>{children}</>;
}

/** Renders the whole route tree from the module registry. */
export function AppRouter() {
  const modules = getModules();
  return (
    <Routes>
      {/* Was /shop: the product had no front door, and /welcome no inbound link. */}
      <Route path="/" element={<Navigate to="/landing" replace />} />
      {modules.map(module => renderFeatureRoutes(module.routes, module.basePath))}
      <Route path="*" element={<Navigate to="/shop" replace />} />
    </Routes>
  );
}

export { resolveAccess };
