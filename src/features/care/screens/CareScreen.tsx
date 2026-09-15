import React from 'react';
import { useRoutePath } from '@/core/navigation';
import { LiveMarketplaceScreen } from '@/screens/marketplace/LiveMarketplaceScreen';
import { asRoutePath } from '@/lib/workflowRouting';

export function CareScreen() {
  const route = asRoutePath(useRoutePath());
  return <LiveMarketplaceScreen care={route === 'care'} checkout={route === 'checkout'} />;
}
