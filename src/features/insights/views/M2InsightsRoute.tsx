import React, { useEffect, useState } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { InsightsViewModel } from '../viewmodel/InsightsViewModel';
import { M2InsightsView } from './M2InsightsView';

/**
 * Mobile 2.0 My health on the web: /your-care for a signed-in student at
 * phone width (the pill nav's My health). Trends and the report upload are
 * /health/trends and /health/report-upload; no link carries a test, a value or
 * a medicine (Rule L, plan D-M2-9).
 */
export function M2InsightsRoute(): React.ReactElement {
  const { user } = useAuth();
  const slot = usePhoneHeaderSlot();
  const [vm] = useState(() => new InsightsViewModel());
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2InsightsView vm={vm} name={user?.fullName ?? ''} links={{
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
      trends: () => navigate('health/trends'),
      records: () => navigate('records'),
      reportUpload: () => navigate('health/report-upload'),
      medicines: () => navigate('health/medicines'),
      water: () => navigate('health/water'),
      refill: () => navigate('refill-request'),
      // The order's own collection time is picked where the student's orders and prescriptions are.
      collection: () => navigate('prescriptions'),
      addVaccineCard: () => navigate('records'),
      appointments: () => navigate('appointments'),
      movement: () => navigate('movement'),
      steps: () => navigate('health/steps'),
      devices: () => navigate('devices'),
      emergencyCard: () => navigate('emergency-card'),
      pass: () => navigate('pass'),
    }} />
  );
}
