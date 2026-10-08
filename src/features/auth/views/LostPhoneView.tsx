import React from 'react';
import { useAuth } from '@/data/AuthContext';
import { navigate } from '@/lib/workflowRouting';
import { LostPhoneRoute } from './LostPhonePanel';

/**
 * Web route /lost-phone. It used to list made-up devices and always report
 * "signed out, pass cancelled" while calling an endpoint that did not exist;
 * it now uses POST /auth/sessions/revoke-others and reports what happened.
 */
export function LostPhoneView(): React.ReactElement {
  const auth = useAuth();
  return (
    <LostPhoneRoute
      signedIn={auth.status === 'authenticated' && auth.user !== null}
      links={{ signIn: () => navigate('login', 'lost-phone'), openDigitalId: () => navigate('digital-id') }}
    />
  );
}
