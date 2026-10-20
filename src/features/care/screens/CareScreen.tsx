import React, { Suspense, lazy } from 'react';
import { useRoutePath } from '@/core/navigation';
import { LiveMarketplaceScreen } from '@/screens/marketplace/LiveMarketplaceScreen';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { ScreenLoading } from '@/components/health/ScreenLoading';

// Loaded only for a signed-in student, so the public shop does not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));

/**
 * /shop, /care and /checkout. A signed-in student above phone width gets the
 * shop and checkout inside the student web shell (canvas 3b: WebShop,
 * WebSearchResults, WebProduct, WebCheckout); everyone else, and every phone,
 * keeps the public marketplace.
 */
export function CareScreen() {
  const route = asRoutePath(useRoutePath());
  const { user } = useAuth();
  const phoneFrame = usePhoneFrame();
  if (user?.role === 'STUDENT' && !phoneFrame && (route === 'shop' || route === 'checkout')) {
    return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route={route} /></Suspense>;
  }
  return <LiveMarketplaceScreen care={route === 'care'} checkout={route === 'checkout'} shop={route === 'shop'} />;
}
