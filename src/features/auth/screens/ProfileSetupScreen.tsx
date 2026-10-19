import React from 'react';
import { useNavigate } from '@/core/navigation';
import { ProfileSetupView } from '../views/ProfileSetupView';

/** Step 3 of setup: care profile, then the two optional setup questions, then the permission choices. */
export function ProfileSetupScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <ProfileSetupView
      onDone={() => {
        void navigate('/setup/goal');
      }}
    />
  );
}
