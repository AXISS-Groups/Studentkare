import React, { Suspense, lazy } from 'react';
import { useRoutePath } from '@/core/navigation';
import { LiveMarketplaceScreen } from '@/screens/marketplace/LiveMarketplaceScreen';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';

// Loaded only for a signed-in student, so the public shop does not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));

/**
 * /shop, /care and /checkout. A signed-in student gets the shop and checkout
 * inside the workspace: the phone boards at phone width, the student web shell
 * (canvas 3b: WebShop, WebSearchResults, WebProduct, WebCheckout) above it.
 * At phone width /care is Mobile 2.0 Doctor consults (M2Consults) in the
 * phone frame. Everyone else keeps the public marketplace.
 */
export function CareScreen() {
  const route = asRoutePath(useRoutePath());
  const { user } = useAuth();
  const phoneFrame = usePhoneFrame();
  if (user?.role === 'STUDENT' && (route === 'shop' || route === 'checkout' || (route === 'care' && phoneFrame))) {
    return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route={route} /></Suspense>;
  }
  return <LiveMarketplaceScreen care={route === 'care'} checkout={route === 'checkout'} shop={route === 'shop'} />;
}
