import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { AyushViewModel } from '../viewmodel/AyushViewModel';
import { M2AskAyushView } from './M2AskAyushView';

/**
 * Mobile 2.0 Ask Ayush on the web: /ayush for a signed-in student, at phone
 * width (the pill nav's orb) and, `wide`, in the desktop shell (Tier 1 parity
 * plan 2026-10-24 §9: one view, two columns). SOS is the shell's (§1).
 */
export function M2AskAyushRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [vm] = useState(() => new AyushViewModel());
  useEffect(() => {
    void vm.loadHistory();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2AskAyushView vm={vm} wide={wide} links={{
      back: () => navigate('your-care'),
      manageHistory: () => navigate('permissions'),
      help: () => navigate('support'),
      book: () => navigate('care'),
    }} />
  );
}
