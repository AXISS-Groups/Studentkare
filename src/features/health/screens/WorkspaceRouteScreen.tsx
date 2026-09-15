import React from 'react';
import { useRoutePath } from '@/core/navigation';
import { WorkspaceScreen } from '@/screens/workspace/WorkspaceScreen';
import { asRoutePath } from '@/lib/workflowRouting';

export function WorkspaceRouteScreen() {
  const routePath = useRoutePath();
  const route = asRoutePath(routePath);
  return <WorkspaceScreen route={route} />;
}
