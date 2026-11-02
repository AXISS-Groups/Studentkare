import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from './ClinicianConsoleFrame';
import { BookingRequestsPanel } from './BookingRequestsPanel';
import { ClinicianTodayViewModel } from '../viewmodels/ClinicianTodayViewModel';
import { ClinicianTodayView } from './ClinicianTodayView';
import { defaultTodaySource } from '../model/todaySource';
import type { ClinicianTodaySource } from '../model/todaySource';
import { longDate, shortDate } from '../model/todayModel';

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
      <BookingRequestsPanel onChanged={() => void viewModel.load()} />
    </ClinicianConsoleFrame>
  );
});
