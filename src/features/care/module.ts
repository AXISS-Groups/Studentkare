import { registerModule } from '@/core/routing/registry';
import type { FeatureModule } from '@/core/routing/registry';

export const careModule: FeatureModule = {
  id: 'care',
  title: 'Care Marketplace',
  basePath: '/',
  routes: [
    { path: '/shop', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/care', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/checkout', load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/lifeshare', public: true, load: () => import('@/screens/emergency/LifeShareExchangeScreen').then((m) => ({ default: m.LifeShareExchangeScreen })) },
  ],
};

registerModule(careModule);
