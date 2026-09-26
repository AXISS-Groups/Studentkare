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
    // A triage console: it renders named students with their blood group,
    // allergies, hostel block and room number, and it can reassign and resolve
    // incidents. It was declared public, so anyone with the link reached it
    // with no session at all. Staff only; RouteGuard sends everyone else home.
    {
      path: '/meo',
      access: (role) => role === 'CAMPUS_ADMIN' || role === 'NMC_DOCTOR' || role === 'SUPER_ADMIN',
      load: () => import('@/screens/medical/MeoDashboardScreen').then((m) => ({ default: m.MeoDashboardScreen })),
    },
    { path: '/privacy', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/terms', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
  ],
};

registerModule(careModule);
