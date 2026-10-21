import React, { lazy } from 'react';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { navigate } from '@/lib/utils/workflowRouting';
import { pickReturnPhoto } from '@/features/requests/views/pickReturnPhoto.web';

const M2HomeRoute = lazy(() => import('@/features/m2store/views/M2HomeRoute').then((m) => ({ default: m.M2HomeRoute })));
const M2LabsRoute = lazy(() => import('@/features/m2store/views/M2LabsRoute').then((m) => ({ default: m.M2LabsRoute })));
const M2ConsultsRoute = lazy(() => import('@/features/m2store/views/M2ConsultsRoute').then((m) => ({ default: m.M2ConsultsRoute })));
const SearchRoute = lazy(() => import('@/features/discover/views/SearchRoute').then((m) => ({ default: m.SearchRoute })));
const ShopPhoneRoute = lazy(() => import('@/features/shopPhone/views/ShopPhoneRoute').then((m) => ({ default: m.ShopPhoneRoute })));
const OrdersPhoneRoute = lazy(() => import('@/features/orders/views/OrdersPhoneRoute').then((m) => ({ default: m.OrdersPhoneRoute })));
const ReturnRequestRoute = lazy(() => import('@/features/requests/views/ReturnRequestView').then((m) => ({ default: m.ReturnRequestRoute })));

export interface PhoneBoard {
  node: React.ReactNode;
  /** The phone header's title. */
  title: MessageKey;
  /** The board draws its own back control (in its search bar or header), so the phone header does not add one. */
  ownBack: boolean;
}

/**
 * The phone boards that replace a workspace page for a student at phone width
 * (S4 phone frame): Mobile 2.0 Home, Lab tests and Doctor consults (canvas
 * page 9; the shop's first board is Mobile 2.0 Medicines), and from design
 * page 2 search, checkout, orders and returns. Every other route keeps its page. On a wide
 * screen these routes draw the desktop pages as before (search has no
 * desktop page, so it draws the same boards).
 */
export function studentPhoneBoard(route: RoutePath): PhoneBoard | null {
  switch (route) {
    case 'health': return { node: <M2HomeRoute />, title: 'm2.nav.home', ownBack: true };
    case 'lab-tests': return { node: <M2LabsRoute />, title: 'm2.labs.title', ownBack: true };
    case 'care': return { node: <M2ConsultsRoute />, title: 'm2.doc.eyebrow', ownBack: true };
    case 'search': return { node: <SearchRoute />, title: 'phone.search.title', ownBack: true };
    case 'shop': return { node: <ShopPhoneRoute route="shop" />, title: 'm2.med.title', ownBack: false };
    case 'checkout': return { node: <ShopPhoneRoute route="checkout" />, title: 'phone.cart.title', ownBack: true };
    case 'orders': return { node: <OrdersPhoneRoute />, title: 'phone.orders.title', ownBack: true };
    case 'return-request':
      return { node: <ReturnRequestRoute links={{ done: () => navigate('my-requests'), pickPhoto: pickReturnPhoto }} />, title: 'phone.return.title', ownBack: true };
    default: return null;
  }
}

/** /search on a wide screen: the same boards, in the page column. */
export function SearchPage(): React.ReactElement {
  return <SearchRoute />;
}
