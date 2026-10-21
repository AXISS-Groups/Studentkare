import React, { useEffect, useState } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { bindCounter } from '@/features/partner/work/counterSession';
import type { VisitContext } from '@/features/partner/work/counterSession';
import { VerifyFlow } from '@/features/partner/work/VerifyFlow';
import type { VerifyCall } from '@/features/partner/work/VerifyFlow';
import { ContextPills } from '@/screens/vendor/WebScanVerifyScreen';
import { StaffPhone } from './StaffPhone';

/**
 * ScanVerify — the staff app's "Verify student" (design page 6, Tier 1, phone
 * board, approved 2026-10-21). The same check as the counter (VerifyFlow) in
 * the staff phone frame: Pharmacy / Lab / Clinic / Camp, scan (typed code), no
 * phone, student found, compare, verified, mismatch, expired code and offline.
 * After a match, "continue" opens the staff board for that visit.
 */

const NEXT: Record<VisitContext, RoutePath> = { pharmacy: 'staff-handover', lab: 'staff-collect', clinic: 'vendor', camp: 'camp-fast' };

export function StaffScanVerifyScreen({ onNavigate, verify }: { onNavigate: (route: RoutePath) => void; verify?: VerifyCall }) {
  const t = useT();
  const { user } = useAuth();
  const [context, setContext] = useState<VisitContext>('pharmacy');
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  return (
    <StaffPhone
      title={t('partner.vsub.scan.title')}
      subtitle={user?.fullName}
      backLabel={t('pt.sa.back')}
      onBack={() => onNavigate('scan-verify')}
      headerExtra={<ContextPills value={context} onChange={setContext} />}
    >
      <VerifyFlow layout="phone" context={context} verify={verify} onContinue={(chosen) => onNavigate(NEXT[chosen])} />
    </StaffPhone>
  );
}
