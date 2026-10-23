import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@/core/navigation';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { CrisisLinks } from '@/design-system';
import { VerifyGateRoute } from './VerifyGateCard';
import './verify-gate.css';

interface VerifyGateViewProps {
  /** Not now. Defaults to Discover (the board's HomeDiscover). */
  onClose?: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

/**
 * /verify-gate on the web (canvas VerifyGate at phone width: a bottom sheet;
 * WebVerifyGate wider: a centred dialog). Tier 1, approved 2026-10-21.
 *
 * A modal over a strong scrim (`scrim-strong`, never an rgba literal): focus
 * moves in, Tab stays in, Esc is "Not now". The card is VerifyGateCard, shared
 * with the Expo screen.
 */
export function VerifyGateView({ onClose }: VerifyGateViewProps): React.ReactElement {
  const go = useNavigate();
  const phone = usePhoneFrame();
  const dialog = useRef<HTMLDivElement>(null);
  const close = onClose ?? (() => go('/health'));

  useEffect(() => {
    const node = dialog.current;
    if (!node) return undefined;
    const first = node.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const head = items[0];
      const tail = items[items.length - 1];
      if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`sk-gate${phone ? ' sk-gate--sheet' : ''}`}>
      <div className="sk-gate__scrim" aria-hidden="true" onClick={close} />
      <div ref={dialog} className="sk-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="verify-gate-title" tabIndex={-1}>
        {phone ? <span className="sk-gate__grip" aria-hidden="true" /> : null}
        <VerifyGateRoute
          wide={!phone}
          links={{
            finish: () => go('/verify'),
            notNow: close,
            always: {
              crisis: () => go('/crisis'),
              sos: () => go('/sos'),
              emergencyCard: () => go('/emergency-card'),
              help: () => go('/support'),
            },
          }}
        />
        {/* 112 and Tele-MANAS one tap away inside the gate too (DESIGN.md §2.4), not only behind "Crisis support". */}
        <div className="sk-gate__crisis"><CrisisLinks titleKey="crisis.noVerify" testID="crisis-links" /></div>
      </div>
    </div>
  );
}
