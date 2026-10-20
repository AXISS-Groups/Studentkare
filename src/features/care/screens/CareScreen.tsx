import React from 'react';
import { useRoutePath } from '@/core/navigation';
import { LiveMarketplaceScreen } from '@/screens/marketplace/LiveMarketplaceScreen';
import { WorkspaceScreen } from '@/screens/workspace/WorkspaceScreen';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';

export function CareScreen() {
  const route = asRoutePath(useRoutePath());
  const { user } = useAuth();
  const phoneFrame = usePhoneFrame();
  // A signed-in student at phone width gets the shop as the phone boards (ShopHome … OrderSuccess)
  // inside the student phone frame and its tab bar; everyone else keeps the web shop.
  if (phoneFrame && user?.role === 'STUDENT' && (route === 'shop' || route === 'checkout')) return <WorkspaceScreen route={route} />;
  return <LiveMarketplaceScreen care={route === 'care'} checkout={route === 'checkout'} shop={route === 'shop'} />;
}
