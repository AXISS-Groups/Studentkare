import React, { Suspense, useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { DigitalIdRoute } from '@/features/digital_id/views/DigitalIdNativeView';
import { ScreenLoading } from '@/design-system/feedback/ScreenLoading';
import { recordsArt } from '@/features/vault/views/recordsArt';
import { ABHALinkScreen } from './ABHALinkScreen';
import { HealthPassportQRScreen } from './HealthPassportQRScreen';

/** Opens a board panel and scrolls it into view. Mirrors screens/workspace/PhoneBoards.tsx's own usePanel. */
function usePanel(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) document.querySelector('[id^="board-panel-"]')?.scrollIntoView({ block: 'start' });
  }, [open]);
  return [open, () => setOpen(true)];
}

/**
 * Digital ID at both widths (Tier 1 parity plan 2026-10-24 §12): the one view
 * on `DigitalIdViewModel`; the ABHA link form and the desktop-only Health
 * passport open as the existing screens under the board (not through the
 * older `DigitalIdPanel`). Moved out of screens/workspace/PhoneBoards.tsx
 * (architecture guardrail, phase 3): the phone kit's board router needed it
 * without pulling in the rest of PhoneBoards.tsx's screens-tier code.
 */
export function DigitalIdPage({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [abha, openAbha] = usePanel();
  const [passport, openPassport] = usePanel();
  return (
    <>
      <DigitalIdRoute wide={wide} art={wide ? recordsArt.idVerified : undefined}
        links={{ back: wide ? undefined : () => navigate('profile'), pass: () => navigate('pass'), abha: openAbha, insurance: () => navigate('insurance'), passport: wide ? openPassport : undefined }} />
      {abha ? <div id="board-panel-abha"><Suspense fallback={<ScreenLoading />}><ABHALinkScreen /></Suspense></div> : null}
      {passport ? <div id="board-panel-passport"><Suspense fallback={<ScreenLoading />}><HealthPassportQRScreen /></Suspense></div> : null}
    </>
  );
}
