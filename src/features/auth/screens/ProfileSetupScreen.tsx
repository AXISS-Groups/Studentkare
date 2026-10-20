import React from 'react';
import { useNavigate } from '@/core/navigation';
import { ProfileSetupView } from '../views/ProfileSetupView';

/** Step 3 of setup: care profile, then the two optional setup questions, then the permission choices. */
export function ProfileSetupScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <ProfileSetupView
      onBack={() => {
        // Setup is entered from the account; going back leaves it for wherever the student came from.
        if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
        else void navigate('/account-ready');
      }}
      onDone={() => {
        void navigate('/setup/goal');
      }}
    />
  );
}
