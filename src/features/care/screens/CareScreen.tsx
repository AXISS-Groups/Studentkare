import React, { Suspense, lazy } from 'react';
import { useRoutePath } from '@/core/navigation';
import { LiveMarketplaceScreen } from '@/screens/marketplace/LiveMarketplaceScreen';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';

// Loaded only for a signed-in student, so the public shop does not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));
// The Mobile 2.0 web shop in the public site's frame (visitors and other roles).
const PublicShopPage = lazy(() => import('@/features/studentweb/views/shop/PublicShopPage').then((m) => ({ default: m.PublicShopPage })));

/**
 * /shop, /care and /checkout. A signed-in student gets the shop and checkout
 * inside the workspace: the phone boards at phone width, the student web shell
 * (the Mobile 2.0 web shop: WebShop, WebSearchResults, WebProduct,
 * WebCheckout) above it. /care is Mobile 2.0 Doctor consults (M2Consults):
 * in the phone frame at phone width, in the student web shell above it (the
 * shell's own "Doctors" link must not drop the student into another site's
 * header). Everyone else gets the same Mobile 2.0 web shop and checkout inside
 * the public site's header and footer; visitors on /care keep the public marketplace.
 */
export function CareScreen() {
  const route = asRoutePath(useRoutePath());
  const { user } = useAuth();
  if (user?.role === 'STUDENT' && (route === 'shop' || route === 'checkout' || route === 'care')) {
    return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route={route} /></Suspense>;
  }
  if (route === 'shop' || route === 'checkout') {
    return <Suspense fallback={<ScreenLoading />}><PublicShopPage route={route} signedIn={Boolean(user)} /></Suspense>;
  }
  return <LiveMarketplaceScreen care={route === 'care'} />;
}
