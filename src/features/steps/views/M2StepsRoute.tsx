import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { StepsViewModel } from '../viewmodel/StepsViewModel';
import { M2StepsView } from './M2StepsView';

/**
 * Steps on the web: /health/steps (the phone frame at phone width, the page
 * column above it). A browser cannot count steps reliably, so no source is
 * connected here: the screen shows the week from the server, says to open the
 * phone app to count steps automatically, and keeps typed entry.
 */
export function M2StepsRoute(): React.ReactElement {
  const [vm] = useState(() => new StepsViewModel());
  useEffect(() => { vm.open(); return () => vm.dispose(); }, [vm]);
  return <M2StepsView vm={vm} links={{ back: () => navigate(STUDENT_NAV_ROUTES.health) }} />;
}
