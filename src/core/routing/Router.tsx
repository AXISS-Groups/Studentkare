import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from '@/core/navigation';
import { getModules, resolveAccess, joinPath } from './registry';
import type { FeatureRoute } from './registry';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';

const HTTP_TOO_MANY_REQUESTS = 429;

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
export function RouteGuard({
  access,
  public: isPublic,
  children,
}: {
  access?: (role: import('@/data/types/workflowTypes').AccountRole | null) => boolean;
  public?: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const auth = useAuth();
  const t = useT();
  if (isPublic) return <>{children}</>;
  if (auth.status === 'loading') return <ScreenLoading />;
  if (auth.status === 'error') {
    // A 429 is the server asking for a pause, not a broken session: say so.
    if (auth.errorStatus === HTTP_TOO_MANY_REQUESTS) {
      return <section className="wf-state" role="alert">
        <h2>{t('ident.session.tooMany')}</h2>
        <button className="health-button" onClick={auth.refresh}>{t('ident.session.retry')}</button>
      </section>;
    }
    return <section className="wf-state" role="alert">
      <h2>{t('ident.session.checkFailed')}</h2>
      <p>{auth.error}</p>
      <button className="health-button" onClick={auth.refresh}>{t('ident.session.retry')}</button>
    </section>;
  }
  if (!auth.user) {
    const next = location.pathname.replace(/^\//, '');
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  // The server holds this session to 2FA set-up; every other screen would only
  // meet 403s, so send it to the one place it can act.
  if (auth.user.twoFactorSetupRequired && location.pathname !== '/security') {
    return <Navigate to="/security" replace />;
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
      {/*
        `/` is a real route in the landing module, not a redirect. It used to
        Navigate to "/shop", then to "/landing"; the latter meant the canonical
        home URL became /landing and the root was only a waystation. Worse, when
        the landing module was being tree-shaken out of the production build,
        /landing matched nothing and fell through to the catch-all below — so the
        root bounced / -> /landing -> /shop and the landing page was unreachable.
      */}
      {modules.map(module => renderFeatureRoutes(module.routes, module.basePath))}
      <Route path="*" element={<Navigate to="/shop" replace />} />
    </Routes>
  );
}

export { resolveAccess };
