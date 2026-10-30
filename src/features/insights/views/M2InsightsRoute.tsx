import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@/data/contexts/AuthContext';
import { apiFileUrl } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { InsightsViewModel } from '../viewmodel/InsightsViewModel';
import { M2InsightsView } from './M2InsightsView';

/**
 * Mobile 2.0 My health on the web: /your-care for a signed-in student at
 * phone width (the pill nav's My health). Trends and the report upload are
 * /health/trends and /health/report-upload; no link carries a test, a value or
 * a medicine (Rule L, plan D-M2-9). Above phone width the desktop shell draws
 * it `wide` (Tier 1 parity plan 2026-10-24 §2); SOS is the shell's (§1).
 */
export function M2InsightsRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const { user } = useAuth();
  const [vm] = useState(() => new InsightsViewModel());
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2InsightsView vm={vm} name={user?.fullName ?? ''} wide={wide} links={{
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
      // "Reviewed lab reports" (§3, Q3): the report itself (its document id, as the Report insights page links it) and that page.
      allReports: () => navigate('report-insights'),
      downloadReport: (documentId) => void Linking.openURL(apiFileUrl(documentId)),
    }} />
  );
}
