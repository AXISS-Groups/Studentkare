import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';

// A signed-in student gets the directory inside the workspace (phone frame or student web shell).
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));
const PublicFindCarePage = lazy(() => import('../views/PublicFindCarePage').then((m) => ({ default: m.PublicFindCarePage })));

/**
 * /find-care: public. A signed-in student gets their campus listings, slots and
 * booking inside the workspace; everyone else the public page (no location stored).
 */
export function FindCareScreen(): React.ReactElement {
  const { user } = useAuth();
  if (user?.role === 'STUDENT') return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route="find-care" /></Suspense>;
  return <Suspense fallback={<ScreenLoading />}><PublicFindCarePage /></Suspense>;
}
