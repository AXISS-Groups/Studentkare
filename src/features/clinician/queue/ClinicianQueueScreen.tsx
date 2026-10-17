import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianQueueViewModel } from './ClinicianQueueViewModel';
import { ClinicianQueueView } from './ClinicianQueueView';
import { defaultQueueSource } from './queueSource';
import type { ClinicianQueueSource } from './queueSource';

/** Today's queue (`/clinician/queue`). */
export function ClinicianQueueScreen({ source }: { source?: ClinicianQueueSource }): React.ReactElement {
  const [viewModel] = useState(() => new ClinicianQueueViewModel(source ?? defaultQueueSource()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);

  return (
    <ClinicianConsoleFrame current="queue" context="Queue">
      <ClinicianQueueView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
