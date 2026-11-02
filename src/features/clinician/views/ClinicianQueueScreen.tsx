import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from './ClinicianConsoleFrame';
import { BookingRequestsPanel } from './BookingRequestsPanel';
import { ClinicianQueueViewModel } from '../viewmodels/ClinicianQueueViewModel';
import { ClinicianQueueView } from './ClinicianQueueView';
import { defaultQueueSource } from '../model/queueSource';
import type { ClinicianQueueSource } from '../model/queueSource';

/** Today's queue (`/clinician/queue`), from the doctor's own bookings. */
export function ClinicianQueueScreen({ source }: { source?: ClinicianQueueSource }): React.ReactElement {
  const t = useT();
  const [viewModel] = useState(() => new ClinicianQueueViewModel(source ?? defaultQueueSource()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);

  return (
    <ClinicianConsoleFrame current="queue" context={t('console.clin.nav.queue')}>
      <ClinicianQueueView viewModel={viewModel} onNavigate={navigate} />
      <BookingRequestsPanel onChanged={() => void viewModel.load()} />
    </ClinicianConsoleFrame>
  );
}
