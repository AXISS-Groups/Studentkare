import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './theme/theme';
import { AppStoreProvider } from './data/store';
import { publicConfigApi } from './data/api';
import { configurePostHog, initPostHog } from './lib/posthog';
import { initFirebase } from './lib/firebaseClient';
import { LandingPageScreen } from './screens/landing/LandingPageScreen';
import { Flow01SignupScreen } from './screens/auth/Flow01SignupScreen';
import { Flow03LoginScreen } from './screens/auth/Flow03LoginScreen';
import { StudentDashboardScreen } from './screens/dashboard/StudentDashboardScreen';
import { SuperAdminDashboardScreen } from './screens/admin/SuperAdminDashboardScreen';
import { VendorPartnerDashboardScreen } from './screens/vendor/VendorPartnerDashboardScreen';
import { AIChatModal } from './components/AIChatModal';
import { FooterStatusBar } from './components/FooterStatusBar';
import { PageLoaderOverlay } from './components/PageLoaderOverlay';

export type AppScreen = 'splash' | 'signup' | 'login' | 'dashboard' | 'admin' | 'vendor';

const MainApp: React.FC = () => {
  const { tokens } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNavLoading, setIsNavLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Loading Module...');

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

  const navigateToScreen = (nextScreen: AppScreen, label?: string) => {
    if (nextScreen === currentScreen) return;
    setLoadingLabel(label || `Navigating to ${nextScreen.toUpperCase()}...`);
    setIsNavLoading(true);
    setTimeout(() => {
      setCurrentScreen(nextScreen);
      setTimeout(() => {
        setIsNavLoading(false);
      }, 200);
    }, 5000);
  };

  const handleSwitchRole = (role: 'student' | 'admin' | 'vendor') => {
    if (role === 'student') navigateToScreen('dashboard', 'Loading Student Portal Dashboard...');
    else if (role === 'admin') navigateToScreen('admin', 'Connecting Super Admin Control Room...');
    else if (role === 'vendor') navigateToScreen('vendor', 'Opening Diagnostic & Vendor Console...');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Navigation Loader Effect Overlay */}
      <PageLoaderOverlay isLoading={isNavLoading} label={loadingLabel} />

      <div>
        {/* Screen Routing */}
        {currentScreen === 'splash' && (
          <LandingPageScreen
            onOpenAI={() => setIsAiModalOpen(true)}
            onNavigate={(route) => {
              if (route === 'flow-01' || route === 'signup') navigateToScreen('signup', 'Opening Sign Up & Identity Verification...');
              else if (route === 'flow-03' || route === 'login') navigateToScreen('login', 'Opening Student Auth Gateway...');
              else if (route === 'vault' || route === 'dashboard') navigateToScreen('dashboard', 'Loading Student Portal Dashboard...');
              else navigateToScreen('splash');
            }}
          />
        )}

        {currentScreen === 'signup' && (
          <Flow01SignupScreen
            onComplete={() => navigateToScreen('dashboard', 'Authenticating Student Identity...')}
            onNavigateToLogin={() => navigateToScreen('login', 'Opening Student Auth Gateway...')}
          />
        )}

        {currentScreen === 'login' && (
          <Flow03LoginScreen
            onLoginSuccess={() => navigateToScreen('dashboard', 'Logging into Student Portal...')}
            onNavigateToSignup={() => navigateToScreen('signup', 'Opening Sign Up & Identity Verification...')}
          />
        )}

        {currentScreen === 'dashboard' && (
          <StudentDashboardScreen
            onLogout={() => navigateToScreen('splash', 'Signing out of Student Kare...')}
            onOpenAI={() => setIsAiModalOpen(true)}
          />
        )}

        {currentScreen === 'admin' && (
          <SuperAdminDashboardScreen
            onLogout={() => navigateToScreen('splash', 'Signing out of Control Room...')}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {currentScreen === 'vendor' && (
          <VendorPartnerDashboardScreen
            onLogout={() => navigateToScreen('splash', 'Signing out of Vendor Console...')}
            onSwitchRole={handleSwitchRole}
          />
        )}
      </div>

      {/* Global Bottom Footer Bar with Analytics (0) Badge & Legal Links */}
      <FooterStatusBar />

      {/* Global AI Chat Modal */}
      <AIChatModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppStoreProvider>
        <MainApp />
      </AppStoreProvider>
    </ThemeProvider>
  );
};

export default App;
