import { registerModule } from '@/core/routing';
import type { FeatureModule } from '@/core/routing';

export const authModule: FeatureModule = {
  id: 'auth',
  title: 'Authentication',
  basePath: '/',
  routes: [
    {
      path: '/login',
      public: true,
      load: () => import('./screens/AuthRouteScreen').then((m) => ({ default: m.AuthRouteScreen })),
    },
    {
      path: '/signup',
      public: true,
      load: () => import('./screens/AuthRouteScreen').then((m) => ({ default: m.AuthRouteScreen })),
    },
    {
      path: '/welcome',
      public: true,
      load: () => import('./views/WelcomeFlowView').then((m) => ({ default: m.WelcomeFlowView })),
    },
    {
      path: '/account-ready',
      load: () => import('./screens/AccountReadyScreen').then((m) => ({ default: m.AccountReadyScreen })),
    },
    {
      path: '/profile-setup',
      load: () => import('./screens/ProfileSetupScreen').then((m) => ({ default: m.ProfileSetupScreen })),
    },
    {
      path: '/permissions',
      load: () => import('./screens/PermissionsScreen').then((m) => ({ default: m.PermissionsScreen })),
    },
    {
      path: '/logged-out',
      public: true,
      load: () => import('./views/LoggedOutView').then((m) => ({ default: m.LoggedOutView })),
    },
    {
      path: '/lost-phone',
      public: true,
      load: () => import('./views/LostPhoneView').then((m) => ({ default: m.LostPhoneView })),
    },
    {
      path: '/verify',
      load: () => import('./views/IdentityVerifyView').then((m) => ({ default: m.IdentityVerifyView })),
    },
    {
      path: '/verify-gate',
      public: true,
      load: () => import('./views/VerifyGateView').then((m) => ({ default: m.VerifyGateView })),
    },
    {
      path: '/guardian-consent',
      public: true,
      load: () => import('./views/GuardianConsentView').then((m) => ({ default: m.GuardianConsentView })),
    },
    {
      path: '/guardian-approve',
      public: true,
      load: () => import('./views/GuardianConsentView').then((m) => ({ default: m.GuardianConsentView })),
    },
    {
      path: '/onboarding',
      public: true,
      load: () => import('@/screens/auth/StudentOnboardingWizard').then((m) => ({ default: m.StudentOnboardingWizard })),
    },
  ],
};

registerModule(authModule);
