import React from 'react';
import { useNavigate } from '@/core/navigation';
import { useAuth } from '@/data/AuthContext';
import { homeForRole } from '@/lib/workflowRouting';
import { PermissionsView } from '../views/PermissionsView';

/**
 * Routes the Permissions view. Both "Finish setup" and "Not now" land in the
 * same place: the screen is a choice, not a gate, so declining must not cost
 * the student anything.
 */
export function PermissionsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <PermissionsView
      onDone={() => {
        // The route needs a session, so a user is expected here. If the
        // session went away mid-screen, sign-in is the right place to land.
        void navigate(auth.user ? `/${homeForRole(auth.user.role)}` : '/login');
      }}
    />
  );
}
