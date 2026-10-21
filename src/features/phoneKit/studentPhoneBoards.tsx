import React, { lazy } from 'react';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { navigate } from '@/lib/utils/workflowRouting';
import { pickReturnPhoto } from '@/features/requests/views/pickReturnPhoto.web';

// keep-sorted start
const CareDirectoryRoute = lazy(() => import('@/features/careDirectory/views/CareDirectoryRoute').then((m) => ({ default: m.CareDirectoryRoute })));
const IdentityVerifyView = lazy(() => import('@/features/auth/views/IdentityVerifyView').then((m) => ({ default: m.IdentityVerifyView })));
const M2AskAyushRoute = lazy(() => import('@/features/chat/views/M2AskAyushRoute').then((m) => ({ default: m.M2AskAyushRoute })));
const M2ConsultsRoute = lazy(() => import('@/features/m2store/views/M2ConsultsRoute').then((m) => ({ default: m.M2ConsultsRoute })));
const M2HomeRoute = lazy(() => import('@/features/m2store/views/M2HomeRoute').then((m) => ({ default: m.M2HomeRoute })));
const M2InsightsRoute = lazy(() => import('@/features/insights/views/M2InsightsRoute').then((m) => ({ default: m.M2InsightsRoute })));
const M2LabsRoute = lazy(() => import('@/features/m2store/views/M2LabsRoute').then((m) => ({ default: m.M2LabsRoute })));
const M2OrdersRoute = lazy(() => import('@/features/m2store/views/M2OrdersRoute').then((m) => ({ default: m.M2OrdersRoute })));
const M2ProfileRoute = lazy(() => import('@/features/m2profile/views/M2ProfileRoute').then((m) => ({ default: m.M2ProfileRoute })));
const M2RemindersRoute = lazy(() => import('@/features/reminders/views/M2RemindersRoute').then((m) => ({ default: m.M2RemindersRoute })));
const M2ReportUploadRoute = lazy(() => import('@/features/labResults/views/M2ReportUploadRoute').then((m) => ({ default: m.M2ReportUploadRoute })));
const M2StepsRoute = lazy(() => import('@/features/steps/views/M2StepsRoute').then((m) => ({ default: m.M2StepsRoute })));
const M2TrendsRoute = lazy(() => import('@/features/labResults/views/M2TrendsRoute').then((m) => ({ default: m.M2TrendsRoute })));
const M2VaccinesRoute = lazy(() => import('@/features/preventive/views/M2VaccinesRoute').then((m) => ({ default: m.M2VaccinesRoute })));
const M2WaterRoute = lazy(() => import('@/features/reminders/views/M2WaterRoute').then((m) => ({ default: m.M2WaterRoute })));
const ReturnRequestRoute = lazy(() => import('@/features/requests/views/ReturnRequestView').then((m) => ({ default: m.ReturnRequestRoute })));
const SearchRoute = lazy(() => import('@/features/discover/views/SearchRoute').then((m) => ({ default: m.SearchRoute })));
const ShopPhoneRoute = lazy(() => import('@/features/shopPhone/views/ShopPhoneRoute').then((m) => ({ default: m.ShopPhoneRoute })));
// keep-sorted end

export interface PhoneBoard {
  node: React.ReactNode;
  /** The phone header's title. */
  title: MessageKey;
  /** The board draws its own back control (in its search bar or header), so the phone header does not add one. */
  ownBack: boolean;
}

/**
 * The phone boards that replace a workspace page for a student at phone width
 * (S4 phone frame): Mobile 2.0 Home, Lab tests, Doctor consults, Find care, Orders,
 * Vaccines, My health (Insights) and its Steps screen, Ask Ayush and Profile (canvas page 9; the shop's first
 * board is Mobile 2.0 Medicines, its product page M2Product), and from design
 * page 2 search, checkout and returns. Every other route keeps its page. On a wide
 * screen these routes draw the desktop pages as before (search has no
 * desktop page, so it draws the same boards).
 */
export function studentPhoneBoard(route: RoutePath): PhoneBoard | null {
  switch (route) {
    case 'health': return { node: <M2HomeRoute />, title: 'm2.nav.home', ownBack: true };
    case 'lab-tests': return { node: <M2LabsRoute />, title: 'm2.labs.title', ownBack: true };
    case 'care': return { node: <M2ConsultsRoute />, title: 'm2.doc.eyebrow', ownBack: true };
    case 'find-care': return { node: <CareDirectoryRoute />, title: 'fc.eyebrow', ownBack: true };
    case 'your-care': return { node: <M2InsightsRoute />, title: 'm2.nav.health', ownBack: true };
    case 'ayush': return { node: <M2AskAyushRoute />, title: 'm2.nav.ayush', ownBack: true };
    case 'preventive-care': return { node: <M2VaccinesRoute />, title: 'm2.vac.eyebrow', ownBack: true };
    case 'profile': return { node: <M2ProfileRoute />, title: 'm2.nav.profile', ownBack: true };
    case 'health/trends': return { node: <M2TrendsRoute />, title: 'm2v.tr.title', ownBack: true };
    case 'health/report-upload': return { node: <M2ReportUploadRoute />, title: 'm2v.up.title', ownBack: true };
    case 'health/medicines': return { node: <M2RemindersRoute />, title: 'm2r.meds.title', ownBack: true };
    case 'health/water': return { node: <M2WaterRoute />, title: 'm2r.water.title', ownBack: true };
    case 'health/steps': return { node: <M2StepsRoute />, title: 'steps.title', ownBack: true };
    case 'search': return { node: <SearchRoute />, title: 'phone.search.title', ownBack: true };
    case 'shop': return { node: <ShopPhoneRoute route="shop" />, title: 'm2.med.title', ownBack: false };
    case 'checkout': return { node: <ShopPhoneRoute route="checkout" />, title: 'phone.cart.title', ownBack: true };
    case 'orders': return { node: <M2OrdersRoute />, title: 'phone.orders.title', ownBack: true };
    case 'return-request':
      return { node: <ReturnRequestRoute links={{ done: () => navigate('my-requests'), pickPhoto: pickReturnPhoto }} />, title: 'phone.return.title', ownBack: true };
    // VerifyIdentity (Tier 1): the board draws its own back button.
    case 'verify': return { node: <IdentityVerifyView />, title: 'verify.title', ownBack: true };
    default: return null;
  }
}

/** /search on a wide screen: the same boards, in the page column. */
export function SearchPage(): React.ReactElement {
  return <SearchRoute />;
}
