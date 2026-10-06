import React, { Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate } from '@/core/navigation';
import { ThemeProvider } from './theme/theme';
import { AuthProvider, useAuth } from './data/AuthContext';
import { AppStoreProvider } from './data/store';
import { LiveCartProvider } from './data/LiveCartContext';
import { ExerciseProvider } from './data/ExerciseStore';
import { InterfaceBar } from './components/interface/InterfaceBar';
import { AmbientBackground } from './components/interface/AmbientBackground';
import { PageTransition } from './components/interface/PageTransition';
import { ErrorBoundary } from './components/interface/ErrorBoundary';
import { ScreenLoading } from './components/health/ScreenLoading';
import { StudentKarePageLoader } from './components/interface/StudentKarePageLoader';
import { SEOHead } from './components/interface/SEOHead';
import { asRoutePath, registerGlobalNavigator } from './lib/workflowRouting';
import { publicConfigApi } from './data/api';
import { configurePostHog, initPostHog } from './lib/posthog';
import { initFirebase } from './lib/firebaseClient';
import { AppRouter } from './core/routing/Router';
import { isPublicPath } from './core/routing/registry';
// Register route metadata without eagerly loading screen-exporting feature barrels.
import './features/auth/module';
import './features/landing/module';
import './features/care/module';
import './features/health/module';
import './theme/marketplace.css';
import './theme/health-experience.css';
import './theme/workflows.css';
import './theme/indigo.css';

function RouterShell() {
  const auth = useAuth();
  const location = useLocation();
  const routerNav = useNavigate();
  const routePath = asRoutePath(location.pathname.replace(/^\//, ''));
  const mainContent = useRef<HTMLDivElement>(null);
  const previousPath = useRef(location.pathname);
  const [isRouteChanging, setIsRouteChanging] = useState(false);

  useEffect(() => {
    registerGlobalNavigator((to) => routerNav(to));
    return () => registerGlobalNavigator(null);
  }, [routerNav]);

  // Automatically convert any legacy #/path URLs into clean HTML5 paths without #.
  useEffect(() => {
    if (window.location.hash.startsWith('#/')) {
      const cleanPath = window.location.hash.substring(1);
      window.history.replaceState(null, '', cleanPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      setIsRouteChanging(true);
      mainContent.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isRouteChanging) {
      const timer = setTimeout(() => {
        setIsRouteChanging(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isRouteChanging]);

  // Init SuperAdmin-configured integrations (PostHog + Firebase) once.
  useEffect(() => {
    (async () => {
      try {
        const pc = await publicConfigApi.getPublicConfig();
        if (pc?.posthog) {
          configurePostHog(pc.posthog);
          await initPostHog();
        }
        if (pc?.firebase) await initFirebase(pc.firebase);
      } catch {
        /* integrations optional */
      }
    })();
  }, []);

  const section = routePath.startsWith('admin') ? 'Operations' : ['shop', 'care', 'checkout'].includes(routePath) ? 'Marketplace' : routePath === 'login' ? 'Sign in' : routePath === 'signup' ? 'Create an account' : 'Your care workspace';
  const isLandingPage = routePath === 'shop' || location.pathname === '/' || location.pathname === '/shop';
  const isVendorRoute = [
    '/vendor',
    '/handover',
    '/vendor-handover',
    '/substitutions',
    '/vendor-substitutions',
    '/verify',
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
  ].some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  const isPublicView =
    isLandingPage ||
    isVendorRoute ||
    isPublicPath(location.pathname) ||
    [
      '/landing',
      '/clinicians',
      '/campuses',
      '/lab-tests',
      '/pricing',
      '/partnerships',
      '/privacy',
      '/terms',
      '/shop',
      '/care',
      '/handover',
      '/vendor-handover',
      '/substitutions',
      '/vendor-substitutions',
      '/reorder',
      '/vendor-reorder',
      '/camp-intake',
      '/vendor-camp-intake',
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
    ].includes(location.pathname);

  return (
    <div className="wf-application" style={{ background: '#F6F7FC', minHeight: '100vh', width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
      <SEOHead />
      {!isPublicView && <AmbientBackground />}
      {isRouteChanging && <StudentKarePageLoader duration={7000} onComplete={() => setIsRouteChanging(false)} />}
      <a className="wf-skip-link" href="#main-content" onClick={event => {
        event.preventDefault();
        mainContent.current?.focus({ preventScroll: true });
        mainContent.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }}>Skip to content</a>
      {!isPublicView && <InterfaceBar section={section} />}
      {auth.status === 'error' && isPublicPath(location.pathname) && (
        <div className="wf-connection-banner" role="status">
          {auth.error}
          <button onClick={auth.refresh}>Retry connection</button>
        </div>
      )}
      <div id="main-content" ref={mainContent} tabIndex={-1} style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <ErrorBoundary>
          <Suspense fallback={<ScreenLoading />}>
            <PageTransition key={location.pathname}>
              <AppRouter />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStoreProvider>
          <LiveCartProvider>
            <ExerciseProvider>
              <BrowserRouter>
                <RouterShell />
              </BrowserRouter>
            </ExerciseProvider>
          </LiveCartProvider>
        </AppStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
export { App };
