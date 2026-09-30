import React, { useState } from 'react';
import { navigate } from '@/lib/workflowRouting';
import { DoctorApplyViewModel } from './DoctorApplyViewModel';
import { DoctorApplyView } from './DoctorApplyView';
import { defaultApplySource } from './applySource';
import type { DoctorApplySource } from './applySource';
import '@/design-system/design-system.css';

/** `/clinicians/apply` — public. A doctor applying to join. */
export function DoctorApplyScreen({ source }: { source?: DoctorApplySource }): React.ReactElement {
  const [viewModel] = useState(() => new DoctorApplyViewModel(source ?? defaultApplySource()));
  return <DoctorApplyView viewModel={viewModel} onNavigate={navigate} />;
}
