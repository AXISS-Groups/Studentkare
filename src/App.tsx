import React, { Suspense, useEffect, useRef } from 'react';
import { LanguageProvider, useT } from './i18n';
import { BrowserRouter, useLocation, useNavigate } from '@/core/navigation';
import { ThemeProvider } from './theme/tokens/theme';
import { AuthProvider, useAuth } from './data/contexts/AuthContext';
import { AccountAppearanceProvider } from './features/account/views/AccountAppearanceSync';
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
import { applyPublicConfig } from './data/services/config';
import { configurePostHog, initPostHog } from './lib/analytics/posthog';
import { AppRouter } from './core/routing/Router';
import { isPublicPath } from './core/routing/registry';
import { isVendorPath } from './screens/vendor/vendorRoutes';
import { isClinicianConsolePath } from './features/clinician/shared/clinicianRoutes';
import { isWorkspacePath } from './features/health/module';
import { usePhoneFrame } from './design-system/navigation/usePhoneFrame';
import { isCampusConsolePath, opensInCampusConsole } from './features/campus/console/campusConsoleRoutes';
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
  const t = useT();
  const location = useLocation();
  const routerNav = useNavigate();
  const routePath = asRoutePath(location.pathname.replace(/^\//, ''));
  const mainContent = useRef<HTMLDivElement>(null);
  const previousPath = useRef(location.pathname);
  const phoneFrame = usePhoneFrame();

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
        applyPublicConfig(pc);
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
      }}>{t('common.skipToContent')}</a>
      {/* Consoles with their own sidebar and top-right actions (SOS included) draw no
          app bar above them: it pushed their full-height sidebar below the window, so its
          footer could not be reached. */}
      {/* A student at phone width gets the phone frame's own header (SOS included) from the workspace;
          wider, the student web shell's top nav carries Alerts and SOS, so no second bar is drawn above it. */}
      {!isPublicView && !hasOwnChrome && !drawsStudentPhoneFrame(location.pathname, auth.user?.role ?? null, phoneFrame) && !drawsStudentWebShell(location.pathname, auth.user?.role ?? null, phoneFrame) && <InterfaceBar section={section} />}
      {auth.status === 'error' && isPublicPath(location.pathname) && (
        <div className="wf-connection-banner" role="status">
          {auth.error}
          <button onClick={auth.refresh}>{t('common.retryConnection')}</button>
        </div>
      )}
      <div id="main-content" ref={mainContent} tabIndex={-1} style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <ErrorBoundary>
          <Suspense fallback={<ScreenLoading />}>
            {/* Moving between Super Admin (or partner console) sections must not remount the
                console: one key per area keeps the shell and sidebar (and its scroll) in place,
                and only the section content fades in (see super-admin-shell.css, vendor-shell.css). */}
            <PageTransition key={pageTransitionKey(location.pathname, auth.user?.role ?? null)}>
              <AppRouter />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

/** A signed-in student's workspace page at phone width draws the phone frame (header and tab bar), not the app bar. */
export function drawsStudentPhoneFrame(pathname: string, role: string | null, phoneWidth: boolean): boolean {
  // The shop and checkout are public pages, but a signed-in student at phone width gets them as phone boards in the frame.
  return phoneWidth && role === 'STUDENT' && (isWorkspacePath(pathname) || STUDENT_PHONE_SHOP_PATHS.includes(pathname));
}

/**
 * Public store pages that a signed-in student at phone width sees in the student
 * phone frame: the shop and checkout (see CareScreen), and the Mobile 2.0 Lab
 * tests (/lab-tests, see LabTestsScreen) and Doctor consults (/care) boards.
 */
export const STUDENT_PHONE_SHOP_PATHS: readonly string[] = ['/shop', '/checkout', '/lab-tests', '/care'];
/** Pages a signed-in student gets in the student web shell (top nav with Alerts and SOS) above phone width. */
export const STUDENT_SHELL_COMMERCE_PATHS: readonly string[] = ['/shop', '/checkout', '/lab-tests'];

/** A signed-in student's page above phone width draws the student web shell (its own Alerts and SOS), not the app bar. */
export function drawsStudentWebShell(pathname: string, role: string | null, phoneWidth: boolean): boolean {
  return !phoneWidth && role === 'STUDENT' && (isWorkspacePath(pathname) || STUDENT_SHELL_COMMERCE_PATHS.includes(pathname));
}

/**
 * The Super Admin console, the clinician console for a doctor and the campus
 * console for a campus admin (and the super admin), draw their own
 * sidebar and top-right actions (SOS included), so the app bar is not drawn above
 * them. (Partner console pages are already public views without it.)
 */
export function consoleHasOwnChrome(pathname: string, role: string | null): boolean {
  if (/^\/admin(\/|$)/.test(pathname)) return true;
  // The passcode page is drawn in the sign-in frame: its own logo, language switch and emergency strip.
  if (pathname === '/set-passcode') return true;
  if (opensInCampusConsole(pathname, role)) return true;
  return role === 'NMC_DOCTOR' && isClinicianConsolePath(pathname);
}

/** One key each for the /admin area, the partner, clinician and campus consoles, so no shell is remounted between sections. */
export function pageTransitionKey(pathname: string, role: string | null = null): string {
  if (/^\/admin(\/|$)/.test(pathname)) return 'admin';
  // A campus admin's notifications and help open in the campus console, so they share its key.
  if (isCampusConsolePath(pathname) || opensInCampusConsole(pathname, role)) return 'campus';
  if (isClinicianConsolePath(pathname)) return 'clinician';
  return isVendorPath(pathname) ? 'vendor' : pathname;
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AccountAppearanceProvider>
            <AppStoreProvider>
              <LiveCartProvider>
                <ExerciseProvider>
                  <BrowserRouter>
                    <RouterShell />
                  </BrowserRouter>
                </ExerciseProvider>
              </LiveCartProvider>
            </AppStoreProvider>
          </AccountAppearanceProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
export { App };
