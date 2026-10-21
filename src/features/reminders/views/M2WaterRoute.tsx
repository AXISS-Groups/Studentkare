import React, { useEffect, useState } from 'react';
import { useOnline } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { WaterViewModel } from '../viewmodel/WaterViewModel';
import { M2WaterView } from './M2WaterView';

/**
 * Mobile 2.0 Water on the web: /health/water for a signed-in student (the phone
 * frame at phone width, the student web shell above it). Reminders are not
 * offered in a browser (it can remind only while the page is open); the screen
 * says they need the phone app.
 */
export function M2WaterRoute(): React.ReactElement {
  const slot = usePhoneHeaderSlot();
  const online = useOnline();
  const [vm] = useState(() => new WaterViewModel());
  useEffect(() => { vm.setOnline(online); }, [vm, online]);
  useEffect(() => {
    vm.load();
    vm.loadWeek();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2WaterView vm={vm} online={online} links={{
      back: () => navigate(STUDENT_NAV_ROUTES.health),
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
    }} />
  );
}
