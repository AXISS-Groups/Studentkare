import React from 'react';
import { useRoutePath } from '@/core/navigation';
import { WorkspaceScreen } from '@/screens/workspace/WorkspaceScreen';
import { ClinicianTodayScreen } from '@/features/clinician/today/ClinicianTodayScreen';
import { ClinicianQueueScreen } from '@/features/clinician/queue/ClinicianQueueScreen';
import { asRoutePath } from '@/lib/workflowRouting';

export function WorkspaceRouteScreen() {
  const routePath = useRoutePath();
  const route = asRoutePath(routePath);
  // The clinician console has its own frame (design page 5); the role gate
  // for '/clinician' is unchanged and still runs before this screen.
  if (route === 'clinician') return <ClinicianTodayScreen />;
  if (route === 'clinician/queue') return <ClinicianQueueScreen />;
  return <WorkspaceScreen route={route} />;
}
