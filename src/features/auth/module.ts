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
      // The student's optional passcode: after sign-up, from Sign-in & security, and after "forgot passcode".
      path: '/set-passcode',
      access: (role) => role === 'STUDENT',
      load: () => import('./screens/SetPasscodeScreen').then((m) => ({ default: m.SetPasscodeScreen })),
    },
    {
      path: '/profile-setup',
      load: () => import('./screens/ProfileSetupScreen').then((m) => ({ default: m.ProfileSetupScreen })),
    },
    {
      path: '/setup/goal',
      load: () => import('./screens/SetupGoalScreen').then((m) => ({ default: m.SetupGoalScreen })),
    },
    {
      path: '/setup/activity',
      load: () => import('./screens/SetupActivityScreen').then((m) => ({ default: m.SetupActivityScreen })),
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
      // Staff and admin sign-in (canvas AdminSignIn): its own frame, same OTP endpoints with audience STAFF.
      path: '/staff-sign-in',
      public: true,
      load: () => import('./views/AdminSignInView').then((m) => ({ default: m.AdminSignInScreen })),
    },
    {
      // A partner college's invite (B2B, plan tier1-auth-password-2026-10-22 b): the link is /claim#token=….
      path: '/claim',
      public: true,
      load: () => import('./screens/ClaimInviteScreen').then((m) => ({ default: m.ClaimInviteScreen })),
    },
    {
      path: '/verify-gate',
      public: true,
      load: () => import('./views/VerifyGateView').then((m) => ({ default: m.VerifyGateView })),
    },
  ],
};

registerModule(authModule);
