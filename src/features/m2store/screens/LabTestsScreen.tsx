import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { LandingLabTestsView } from '@/features/landing/views/LandingLabTestsView';

// Loaded only for a signed-in student, so the public page does not carry the workspace.
const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));

/**
 * /lab-tests. A signed-in student gets Mobile 2.0 Lab tests (M2Labs) in the
 * workspace: the phone frame at phone width, the student web shell above it.
 * Everyone else keeps the public lab tests page.
 */
export function LabTestsScreen(): React.ReactElement {
  const { user } = useAuth();
  if (user?.role === 'STUDENT') {
    return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route="lab-tests" /></Suspense>;
  }
  return <LandingLabTestsView />;
}
