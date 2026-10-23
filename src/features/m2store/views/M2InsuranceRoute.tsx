import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { InsuranceViewModel } from '../viewmodel/InsuranceViewModel';
import { M2InsuranceView } from './M2InsuranceView';

/**
 * Mobile 2.0 Insurance on the web: /insurance for a signed-in student at phone
 * width (Home's service rail). `manage` opens the full insurance page under
 * the board (eligibility, removing a policy, the benefits guide), as the
 * ClaimsHub board did.
 */
export function M2InsuranceRoute({ manage, wide = false }: { manage?: () => void; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new InsuranceViewModel());
  const slot = usePhoneHeaderSlot();
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2InsuranceView wide={wide} vm={vm} links={{
      back: () => navigate('health'),
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
      manage,
    }} />
  );
}
