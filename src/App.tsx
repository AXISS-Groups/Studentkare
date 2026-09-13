import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from './theme/theme';
import { AuthProvider, useAuth } from './data/AuthContext';
import { AppStoreProvider } from './data/store';
import { LiveCartProvider } from './data/LiveCartContext';
import { ExerciseProvider } from './data/ExerciseStore';
import { InterfaceBar } from './components/interface/InterfaceBar';
import { PageTransition } from './components/interface/PageTransition';
import { EmptyState } from './components/interface/WorkflowUI';
import { ErrorBoundary } from './components/interface/ErrorBoundary';
import { ScreenLoading } from './components/health/ScreenLoading';
import { canAccessRoute, homeForRole, navigate, publicRoutes, readRoute } from './lib/workflowRouting';
import { publicConfigApi } from './data/api';
import { configurePostHog, initPostHog } from './lib/posthog';
import { initFirebase } from './lib/firebaseClient';
import './theme/marketplace.css';
import './theme/health-experience.css';
import './theme/workflows.css';
import './theme/indigo.css';

const Marketplace = lazy(() => import('./screens/marketplace/LiveMarketplaceScreen').then(module => ({ default: module.LiveMarketplaceScreen })));
const AuthFlow = lazy(() => import('./screens/auth/AuthenticatedFlowScreen').then(module => ({ default: module.AuthenticatedFlowScreen })));
const Workspace = lazy(() => import('./screens/workspace/WorkspaceScreen').then(module => ({ default: module.WorkspaceScreen })));

function Application() {
  const auth = useAuth();
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => { setRoute(readRoute()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  useEffect(() => {
    if (!publicRoutes.includes(route.path) && auth.status === 'anonymous' && readRoute().path === route.path) navigate('login', route.path);
  }, [route.path, auth.status]);
  // A signed-in user visiting an auth route is redirected to their workspace.
  useEffect(() => {
    if (auth.user && (route.path === 'login' || route.path === 'signup')) {
      navigate(homeForRole(auth.user.role));
    }
  }, [auth.user, route.path]);

  // Init SuperAdmin-configured integrations (PostHog + Firebase) once
  useEffect(() => {
    (async () => {
      try {
        const pc = await publicConfigApi.getPublicConfig();
        if (pc?.posthog) {
          configurePostHog(pc.posthog);
          await initPostHog();
        }
        if (pc?.firebase) await initFirebase(pc.firebase);
      } catch { /* integrations optional */ }
    })();
  }, []);

  const protectedRoute = !publicRoutes.includes(route.path);
  const render = () => {
    if (auth.status === 'loading' && protectedRoute) return <ScreenLoading />;
    if (protectedRoute && auth.status === 'error') return <EmptyState title="Your session could not be checked." description={auth.error} action="Retry session check" onAction={auth.refresh} />;
    if (protectedRoute && !auth.user) return <ScreenLoading />;
    if (!canAccessRoute(route.path, auth.user?.role || null)) return <EmptyState title="This workspace is not available to your role." description="Access is assigned by the server. Sign in with the account associated with this workspace." action="Go to my workspace" onAction={() => navigate(homeForRole(auth.user!.role))} />;
    if (route.path === 'login' || route.path === 'signup') {
      // Redirect handled in an effect; render a loading state meanwhile.
      if (auth.user) return <ScreenLoading />;
      return <><div className="shop shop-container wf-back-link"><button className="shop-text-button" onClick={() => navigate('shop')}>← Back to marketplace</button></div><AuthFlow key={route.path} mode={route.path} next={route.next} /></>;
    }
    if (route.path === 'shop' || route.path === 'care' || route.path === 'checkout') return <Marketplace key={route.path} care={route.path === 'care'} checkout={route.path === 'checkout'} />;
    return <Workspace route={route.path} />;
  };

  return <ExerciseProvider><div className="wf-application"><a className="wf-skip-link" href="#main-content">Skip to content</a><InterfaceBar section={route.path.startsWith('admin') ? 'Operations' : route.path === 'shop' ? 'Marketplace' : route.path === 'login' ? 'Sign in' : route.path === 'signup' ? 'Create an account' : 'Your care workspace'} />{auth.status === 'error' && !protectedRoute && <div className="wf-connection-banner" role="status">{auth.error}<button onClick={auth.refresh}>Retry connection</button></div>}<ErrorBoundary><Suspense fallback={<ScreenLoading />}><PageTransition key={route.path}><div id="main-content">{render()}</div></PageTransition></Suspense></ErrorBoundary></div></ExerciseProvider>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStoreProvider>
          <LiveCartProvider>
            <Application />
          </LiveCartProvider>
        </AppStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
export { App };
