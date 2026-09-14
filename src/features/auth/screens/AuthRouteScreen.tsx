import React from 'react';
import { Navigate, useLocation, useRoutePath } from '@/core/navigation';
import { AuthenticatedFlowScreen } from './AuthenticatedFlowScreen';
import { asRoutePath, canAccessRoute, homeForRole } from '@/lib/workflowRouting';
import { useAuth } from '@/data/AuthContext';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { readReturnPath } from '@/core/routing/returnPath';

export function AuthRouteScreen() {
  const path = asRoutePath(useRoutePath());
  const location = useLocation();
  const auth = useAuth();
  const mode = path === 'signup' ? 'signup' : 'login';
  const next = readReturnPath(location.search);
  if (auth.status === 'loading') return <ScreenLoading />;
  if (auth.status === 'authenticated' && auth.user) {
    const target = next && canAccessRoute(next, auth.user.role) ? next : homeForRole(auth.user.role);
    return <Navigate to={`/${target}`} replace />;
  }
  return <AuthenticatedFlowScreen mode={mode} next={next} />;
}
