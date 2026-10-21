import React, { Suspense, lazy } from 'react';
import { useRoutePath } from '@/core/navigation';
import { asRoutePath } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';

// Loaded only for a signed-in student, so the public pages do not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));
// The Mobile 2.0 web shop in the public site's frame (visitors and other roles).
const PublicShopPage = lazy(() => import('@/features/studentweb/views/shop/PublicShopPage').then((m) => ({ default: m.PublicShopPage })));
// Mobile 2.0 Doctor consults in the public site's frame (visitors and other roles).
const PublicCarePage = lazy(() => import('@/features/studentweb/views/care/PublicCarePage').then((m) => ({ default: m.PublicCarePage })));

/**
 * /shop, /care and /checkout. A signed-in student gets them inside the
 * workspace: the phone boards at phone width (M2Consults for /care), the
 * student web shell above it (the Mobile 2.0 web shop and WebCheckout; for
 * /care, Doctor consults in the Mobile 2.0 web layout). Everyone else gets the
 * same Mobile 2.0 pages inside the public site's header and footer, at any
 * width.
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
  return <Suspense fallback={<ScreenLoading />}><PublicCarePage signedIn={Boolean(user)} /></Suspense>;
}
