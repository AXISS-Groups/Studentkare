import React from 'react';
import { useNavigate } from '@/core/navigation';
import { SetupQuestionView } from '../views/SetupQuestionView';

/** Setup question 2 of 2: activity level. Optional; Skip and Continue both move on. */
export function SetupActivityScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <SetupQuestionView
      question="activityLevel"
      step={2}
      total={2}
      onBack={() => void navigate('/setup/goal')}
      onDone={() => void navigate('/permissions')}
    />
  );
}
