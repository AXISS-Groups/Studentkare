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
  ],
};

registerModule(authModule);
