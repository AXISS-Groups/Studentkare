import React, { lazy } from 'react';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { navigate } from '@/lib/utils/workflowRouting';
import { pickReturnPhoto } from '@/features/requests/views/pickReturnPhoto.web';

const HomeDiscoverRoute = lazy(() => import('@/features/discover/views/HomeDiscoverRoute').then((m) => ({ default: m.HomeDiscoverRoute })));
const SearchRoute = lazy(() => import('@/features/discover/views/SearchRoute').then((m) => ({ default: m.SearchRoute })));
const ShopPhoneRoute = lazy(() => import('@/features/shopPhone/views/ShopPhoneRoute').then((m) => ({ default: m.ShopPhoneRoute })));
const OrdersPhoneRoute = lazy(() => import('@/features/orders/views/OrdersPhoneRoute').then((m) => ({ default: m.OrdersPhoneRoute })));
const IdentityVerifyView = lazy(() => import('@/features/auth/views/IdentityVerifyView').then((m) => ({ default: m.IdentityVerifyView })));
const ReturnRequestRoute = lazy(() => import('@/features/requests/views/ReturnRequestView').then((m) => ({ default: m.ReturnRequestRoute })));

export interface PhoneBoard {
  node: React.ReactNode;
  /** The phone header's title. */
  title: MessageKey;
  /** The board draws its own back control (in its search bar or header), so the phone header does not add one. */
  ownBack: boolean;
}

/**
 * The phone boards of design page 2 that replace a workspace page for a
 * student at phone width (S4 phone frame): Discover, search, the shop and
 * checkout, orders and returns. Every other route keeps its page. On a wide
 * screen these routes draw the desktop pages as before (search has no
 * desktop page, so it draws the same boards).
 */
export function studentPhoneBoard(route: RoutePath): PhoneBoard | null {
  switch (route) {
    case 'health': return { node: <HomeDiscoverRoute />, title: 'tabbar.discover', ownBack: false };
    case 'search': return { node: <SearchRoute />, title: 'phone.search.title', ownBack: true };
    case 'shop': return { node: <ShopPhoneRoute route="shop" />, title: 'tabbar.wellness', ownBack: false };
    case 'checkout': return { node: <ShopPhoneRoute route="checkout" />, title: 'phone.cart.title', ownBack: true };
    case 'orders': return { node: <OrdersPhoneRoute />, title: 'phone.orders.title', ownBack: true };
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
