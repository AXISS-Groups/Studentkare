import { registerModule } from '@/core/routing/registry';
import type { FeatureModule } from '@/core/routing/registry';

/**
 * The public front of the product: the landing pages and the legal pages.
 *
 * These were the two gaps in the public surface. `/` redirected straight to
 * `/shop`, so there was no front door and `/welcome` had no inbound link; and
 * `/privacy` and `/terms` were both routed to the marketplace screen, so anyone
 * following either link was served the shop.
 */
export const landingModule: FeatureModule = {
  id: 'landing',
  title: 'Public site',
  basePath: '/',
  routes: [
    // Both: `/` is the canonical home, `/landing` kept so existing links work.
    {
      path: '/',
      public: true,
      load: () => import('./views/LandingView').then((m) => ({ default: m.LandingView })),
    },
    {
      path: '/landing',
      public: true,
      load: () => import('./views/LandingView').then((m) => ({ default: m.LandingView })),
    },
    {
      path: '/campuses',
      public: true,
      load: () => import('./views/LandingCampusView').then((m) => ({ default: m.LandingCampusView })),
    },
    {
      path: '/partnerships',
      public: true,
      load: () =>
        import('./views/LandingPartnershipsView').then((m) => ({ default: m.LandingPartnershipsView })),
    },
    {
      path: '/lab-tests',
      public: true,
      // A signed-in student gets Mobile 2.0 Lab tests in the workspace; everyone else the public page.
      load: () =>
        import('@/features/m2store/screens/LabTestsScreen').then((m) => ({ default: m.LabTestsScreen })),
    },
    {
      path: '/consult',
      public: true,
      // A signed-in student books in the workspace; everyone else the public page.
      load: () => import('./screens/ConsultScreen').then((m) => ({ default: m.ConsultScreen })),
    },
    {
      path: '/wellness',
      public: true,
      load: () =>
        import('./views/LandingWellnessView').then((m) => ({ default: m.LandingWellnessView })),
    },
    {
      path: '/calculators',
      public: true,
      load: () =>
        import('./views/CampusCalculatorsView').then((m) => ({ default: m.CampusCalculatorsView })),
    },
    {
      path: '/bmi',
      public: true,
      load: () =>
        import('./views/CampusCalculatorsView').then((m) => ({ default: m.CampusCalculatorsView })),
    },
    {
      path: '/clinicians',
      public: true,
      load: () =>
        import('./views/LandingClinicianView').then((m) => ({ default: m.LandingClinicianView })),
    },
    {
      path: '/programs',
      public: true,
      load: () =>
        import('./views/LandingProgramsView').then((m) => ({ default: m.LandingProgramsView })),
    },
    {
      path: '/plans',
      public: true,
      load: () =>
        import('./views/LandingPlansView').then((m) => ({ default: m.LandingPlansView })),
    },
    {
      path: '/lab-tests/category',
      public: true,
      load: () =>
        import('./views/LandingLabListView').then((m) => ({ default: m.LandingLabListView })),
    },
    {
      path: '/lab-tests/vitamins',
      public: true,
      load: () =>
        import('./views/LandingLabListView').then((m) => ({ default: m.LandingLabListView })),
    },
    {
      path: '/campuses/apply',
      public: true,
      load: () =>
        import('@/features/campus/apply/CampusApplyScreen').then((m) => ({ default: m.CampusApplyScreen })),
    },
    {
      path: '/partnerships/apply',
      public: true,
      load: () =>
        import('@/features/partner/apply/PartnerApplyScreen').then((m) => ({ default: m.PartnerApplyScreen })),
    },
    {
      path: '/clinicians/apply',
      public: true,
      load: () =>
        import('@/features/clinician/apply/DoctorApplyScreen').then((m) => ({ default: m.DoctorApplyScreen })),
    },
  ],
};

registerModule(landingModule);
