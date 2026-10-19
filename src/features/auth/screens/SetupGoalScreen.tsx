import React from 'react';
import { useNavigate } from '@/core/navigation';
import { SetupQuestionView } from '../views/SetupQuestionView';

/** Setup question 1 of 2: primary goal. Optional; Skip and Continue both move on. */
export function SetupGoalScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <SetupQuestionView
      question="primaryGoal"
      step={1}
      total={2}
      onBack={() => void navigate('/profile-setup')}
      onDone={() => void navigate('/setup/activity')}
    />
  );
}
