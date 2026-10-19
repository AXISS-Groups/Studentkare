import React from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { EmergencySosWebView } from '@/modules/m04-emergency';

/** Web /sos. Public on purpose: signed out, it still offers Call 112 (DESIGN.md §2.4). */
export function SosRouteScreen(): React.ReactElement {
  const auth = useAuth();
  return (
    <EmergencySosWebView
      signedIn={auth.status === 'authenticated' && auth.user?.role === 'STUDENT'}
      links={{ signIn: () => navigate('login', 'sos'), editEmergencyContact: () => navigate('profile') }}
    />
  );
}
