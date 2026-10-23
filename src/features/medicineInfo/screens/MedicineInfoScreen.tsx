import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';

const WorkspaceScreen = lazy(() => import('@/screens/workspace/WorkspaceScreen').then((m) => ({ default: m.WorkspaceScreen })));
const PublicMedicineInfoPage = lazy(() => import('../views/PublicMedicineInfoPage').then((m) => ({ default: m.PublicMedicineInfoPage })));

/**
 * /medicine-info: public. A signed-in student gets it inside the workspace (phone
 * frame or web shell); everyone else the public page. The page reads nothing
 * about the person either way (Rule L).
 */
export function MedicineInfoScreen(): React.ReactElement {
  const { user } = useAuth();
  if (user?.role === 'STUDENT') return <Suspense fallback={<ScreenLoading />}><WorkspaceScreen route="medicine-info" /></Suspense>;
  return <Suspense fallback={<ScreenLoading />}><PublicMedicineInfoPage /></Suspense>;
}
