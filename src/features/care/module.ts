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
    { path: '/medical-incident', public: true, load: () => import('@/screens/medical/MedicalIncidentScreen').then((m) => ({ default: m.MedicalIncidentScreen })) },
    { path: '/meo', public: true, load: () => import('@/screens/medical/MeoDashboardScreen').then((m) => ({ default: m.MeoDashboardScreen })) },
  ],
};

registerModule(careModule);
