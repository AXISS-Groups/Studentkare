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
      path: '/permissions',
      load: () => import('./screens/PermissionsScreen').then((m) => ({ default: m.PermissionsScreen })),
    },
    {
      path: '/logged-out',
      public: true,
      load: () => import('./views/LoggedOutView').then((m) => ({ default: m.LoggedOutView })),
    },
    {
      path: '/onboarding',
      public: true,
      load: () => import('@/screens/auth/StudentOnboardingWizard').then((m) => ({ default: m.StudentOnboardingWizard })),
    },
  ],
};

registerModule(authModule);
