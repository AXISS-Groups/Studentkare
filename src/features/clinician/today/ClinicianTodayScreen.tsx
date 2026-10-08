import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/data/AuthContext';
import { navigate } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianTodayViewModel } from './ClinicianTodayViewModel';
import { ClinicianTodayView } from './ClinicianTodayView';
import { defaultTodaySource } from './todaySource';
import type { ClinicianTodaySource } from './todaySource';
import { longDate, shortDate } from './todayModel';

/** The doctor's home (`/clinician`). */
export const ClinicianTodayScreen = observer(function ClinicianTodayScreen({ source }: { source?: ClinicianTodaySource }): React.ReactElement | null {
  const { user } = useAuth();
  const [viewModel] = useState(() => new ClinicianTodayViewModel(source ?? defaultTodaySource()));

  useEffect(() => { void viewModel.load(); }, [viewModel]);

  if (!user) return null;
  const date = viewModel.data?.date ?? viewModel.now;

  return (
    <ClinicianConsoleFrame current="today" context={longDate(date)} contextShort={shortDate(date)}>
      <ClinicianTodayView viewModel={viewModel} clinicianName={user.fullName} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
});
