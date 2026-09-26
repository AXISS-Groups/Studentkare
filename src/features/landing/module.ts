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
      path: '/clinicians',
      public: true,
      load: () =>
        import('./views/LandingClinicianView').then((m) => ({ default: m.LandingClinicianView })),
    },
  ],
};

registerModule(landingModule);
