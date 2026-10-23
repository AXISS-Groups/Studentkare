import { registerModule } from '@/core/routing/registry';
import type { FeatureModule } from '@/core/routing/registry';

export const careModule: FeatureModule = {
  id: 'care',
  title: 'Care Marketplace',
  basePath: '/',
  routes: [
    { path: '/shop', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/care', public: true, load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    // Find care near you: public (no location stored); a signed-in student gets it in the workspace.
    { path: '/find-care', public: true, load: () => import('@/features/careDirectory/screens/FindCareScreen').then((m) => ({ default: m.FindCareScreen })) },
    // Medicine information: public (reviewed information only; nothing about the person is read or kept).
    { path: '/medicine-info', public: true, load: () => import('@/features/medicineInfo/screens/MedicineInfoScreen').then((m) => ({ default: m.MedicineInfoScreen })) },
    // The newsroom (features/newsroom): Blog and News, public; posts by slug.
    { path: '/blog', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.BlogScreen })) },
    { path: '/blog/:slug', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.BlogPostScreen })) },
    { path: '/news', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.NewsScreen })) },
    { path: '/news/:slug', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.NewsPostScreen })) },
    { path: '/series', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.SeriesListScreen })) },
    { path: '/series/:slug', public: true, load: () => import('@/features/newsroom/screens/NewsroomScreens').then((m) => ({ default: m.SeriesScreen })) },
    { path: '/checkout', load: () => import('./screens/CareScreen').then((m) => ({ default: m.CareScreen })) },
    { path: '/lifeshare', public: true, load: () => import('@/screens/emergency/LifeShareExchangeScreen').then((m) => ({ default: m.LifeShareExchangeScreen })) },
    { path: '/medical-incident', public: true, load: () => import('@/screens/medical/MedicalIncidentScreen').then((m) => ({ default: m.MedicalIncidentScreen })) },
    // SOS: public so a signed-out visitor still gets Call 112; dispatch needs a student session.
    { path: '/sos', public: true, load: () => import('@/features/emergency/screens/SosRouteScreen').then((m) => ({ default: m.SosRouteScreen })) },
    // Crisis support (CrisisSupport, Tier 1): Tele-MANAS and 112, then the first steps. No request on load.
    { path: '/crisis', public: true, load: () => import('@/features/crisis/views/CrisisSupportBoard').then((m) => ({ default: m.CrisisSupportRoute })) },
    // A triage console: it renders named students with their blood group,
    // allergies, hostel block and room number, and it can reassign and resolve
    // incidents. It was declared public, so anyone with the link reached it
    // with no session at all. Staff only; RouteGuard sends everyone else home.
    {
      path: '/meo',
      access: (role) => role === 'CAMPUS_ADMIN' || role === 'NMC_DOCTOR' || role === 'SUPER_ADMIN',
      load: () => import('@/screens/medical/MeoDashboardScreen').then((m) => ({ default: m.MeoDashboardScreen })),
    },
    // Both of these rendered LiveMarketplaceScreen: following "Privacy" or
    // "Terms" on a product holding health records served the shop instead.
    { path: '/privacy', public: true, load: () => import('@/features/legal/views/WebLegalView').then((m) => ({ default: m.WebLegalView })) },
    { path: '/terms', public: true, load: () => import('@/features/legal/views/WebLegalView').then((m) => ({ default: m.WebLegalView })) },
  ],
};

registerModule(careModule);
