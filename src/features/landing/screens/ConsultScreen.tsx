import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { LandingConsultView } from '../views/LandingConsultView';

// Loaded only for a signed-in student, so the public page does not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));

/**
 * /consult. A signed-in student books in their workspace (Appointments) instead of
 * seeing the public page with its "Sign in" (live-run audit #14), as /lab-tests does.
 * Everyone else keeps the public consult page.
 */
export function ConsultScreen(): React.ReactElement {
  const { user } = useAuth();
  if (user?.role === 'STUDENT') {
    return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route="appointments" /></Suspense>;
  }
  return <LandingConsultView />;
}
