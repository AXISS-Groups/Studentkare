import React, { useEffect, useState } from 'react';
import { useOnline } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';
import { M2RemindersView } from './M2RemindersView';
import { useUndoClock } from './useUndoClock';

/**
 * Mobile 2.0 Medicines today on the web: /health/medicines for a signed-in
 * student. No route or link carries a medicine (Rule L). Reminders need the
 * phone app, so none are offered here. "Add a medicine" opens the existing
 * medicine form (/medications).
 */
export function M2RemindersRoute(): React.ReactElement {
  const slot = usePhoneHeaderSlot();
  const online = useOnline();
  const [vm] = useState(() => new MedsTodayViewModel());
  useEffect(() => { vm.setOnline(online); }, [vm, online]);
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  useUndoClock(vm);
  return (
    <M2RemindersView vm={vm} online={online} links={{
      back: () => navigate(STUDENT_NAV_ROUTES.health),
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
      water: () => navigate('health/water'),
      uploadPrescription: () => navigate('prescriptions'),
      addMedicine: () => navigate('medications'),
    }} />
  );
}
