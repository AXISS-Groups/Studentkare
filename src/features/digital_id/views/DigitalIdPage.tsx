import React, { lazy, Suspense } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { ScreenLoading } from '@/design-system/feedback/ScreenLoading';
import { recordsArt } from '@/features/vault/views/recordsArt';
import { usePanel } from '@/features/phoneKit/usePanel';
import { DigitalIdRoute } from './DigitalIdNativeView';

const ABHALinkScreen = lazy(() => import('./ABHALinkScreen').then((module) => ({ default: module.ABHALinkScreen as React.ComponentType })));
const HealthPassportQRScreen = lazy(() => import('./HealthPassportQRScreen').then((module) => ({ default: module.HealthPassportQRScreen })));

/**
 * Digital ID at both widths (Tier 1 parity plan 2026-10-24 §12): the one view
 * on `DigitalIdViewModel`; the ABHA link form and the desktop-only Health
 * passport open as the existing screens under the board (not through the
 * older `DigitalIdPanel`).
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
