import React, { Suspense, useEffect, useRef } from 'react';
import { LanguageProvider } from './i18n';
import { BrowserRouter, useLocation, useNavigate } from '@/core/navigation';
import { ThemeProvider } from './theme/tokens/theme';
import { AuthProvider, useAuth } from './data/contexts/AuthContext';
import { AppStoreProvider } from './data/contexts/store';
import { LiveCartProvider } from './data/contexts/LiveCartContext';
import { ExerciseProvider } from './data/contexts/ExerciseStore';
import { InterfaceBar } from './components/interface/InterfaceBar';
import { AmbientBackground } from './components/interface/AmbientBackground';
import { PageTransition } from './components/interface/PageTransition';
import { ErrorBoundary } from './components/interface/ErrorBoundary';
import { ScreenLoading } from './components/health/ScreenLoading';
import { SEOHead } from './components/interface/SEOHead';
import { asRoutePath, registerGlobalNavigator } from './lib/utils/workflowRouting';
import { publicConfigApi } from './data/api';
import { configurePostHog, initPostHog } from './lib/analytics/posthog';
import { AppRouter } from './core/routing/Router';
import { isPublicPath } from './core/routing/registry';
import { isVendorPath } from './screens/vendor/vendorRoutes';
import { isClinicianConsolePath } from './features/clinician/shared/clinicianRoutes';
// Register route metadata without eagerly loading screen-exporting feature barrels.
import './features/auth/module';
import './features/landing/module';
import './features/care/module';
import './features/health/module';
import './features/dev/module';
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
      mainContent.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Init the SuperAdmin-configured PostHog integration once.
  useEffect(() => {
    (async () => {
      try {
        const pc = await publicConfigApi.getPublicConfig();
        if (pc?.posthog) {
          configurePostHog(pc.posthog);
          await initPostHog();
        }
      } catch {
        /* integrations optional */
      }
    })();
  }, []);

  const section = routePath.startsWith('admin') ? 'Operations' : ['shop', 'care', 'checkout'].includes(routePath) ? 'Marketplace' : routePath === 'login' ? 'Sign in' : routePath === 'signup' ? 'Create an account' : 'Your care workspace';
  const isLandingPage = routePath === 'shop' || location.pathname === '/' || location.pathname === '/shop';
  const isVendorRoute = isVendorPath(location.pathname);
  const hasOwnChrome = consoleHasOwnChrome(location.pathname, auth.user?.role ?? null);
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
    <div className="wf-application" style={{ background: 'var(--sk-color-canvas)', minHeight: '100vh', width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
      <SEOHead />
      {!isPublicView && <AmbientBackground />}
      <a className="wf-skip-link" href="#main-content" onClick={event => {
        event.preventDefault();
        mainContent.current?.focus({ preventScroll: true });
        mainContent.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }}>Skip to content</a>
      {/* Consoles with their own sidebar and top-right actions (SOS included) draw no
          app bar above them: it pushed their full-height sidebar below the window, so its
          footer could not be reached. */}
      {!isPublicView && !hasOwnChrome && <InterfaceBar section={section} />}
      {auth.status === 'error' && isPublicPath(location.pathname) && (
        <div className="wf-connection-banner" role="status">
          {auth.error}
          <button onClick={auth.refresh}>Retry connection</button>
        </div>
      )}
      <div id="main-content" ref={mainContent} tabIndex={-1} style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <ErrorBoundary>
          <Suspense fallback={<ScreenLoading />}>
            {/* Moving between Super Admin (or partner console) sections must not remount the
                console: one key per area keeps the shell and sidebar (and its scroll) in place,
                and only the section content fades in (see super-admin-shell.css, vendor-shell.css). */}
            <PageTransition key={pageTransitionKey(location.pathname)}>
              <AppRouter />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

/**
 * The Super Admin console, and the clinician console for a doctor, draw their own
 * sidebar and top-right actions (SOS included), so the app bar is not drawn above
 * them. (Partner console pages are already public views without it.)
 */
export function consoleHasOwnChrome(pathname: string, role: string | null): boolean {
  if (/^\/admin(\/|$)/.test(pathname)) return true;
  return role === 'NMC_DOCTOR' && isClinicianConsolePath(pathname);
}

/** One key each for the /admin area, the partner console and the clinician console, so no shell is remounted between sections. */
export function pageTransitionKey(pathname: string): string {
  if (/^\/admin(\/|$)/.test(pathname)) return 'admin';
  if (isClinicianConsolePath(pathname)) return 'clinician';
  return isVendorPath(pathname) ? 'vendor' : pathname;
}

export default function App() {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}
export { App };
