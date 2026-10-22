import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { AyushViewModel } from '../viewmodel/AyushViewModel';
import { M2AskAyushView } from './M2AskAyushView';

/** Mobile 2.0 Ask Ayush on the web: /ayush for a signed-in student at phone width (the pill nav's orb). */
export function M2AskAyushRoute(): React.ReactElement {
  const slot = usePhoneHeaderSlot();
  const [vm] = useState(() => new AyushViewModel());
  useEffect(() => {
    void vm.loadHistory();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2AskAyushView vm={vm} links={{
      back: () => navigate('your-care'),
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
      help: () => navigate('support'),
      book: () => navigate('care'),
    }} />
  );
}
