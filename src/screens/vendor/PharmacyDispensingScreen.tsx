import React from 'react';
import { PharmacyQueuePanel } from '../workspace/FulfilmentQueuePanel';
import { useT } from '../../i18n';
import { navigate, RoutePath } from '../../lib/workflowRouting';
import '../../theme/workflows.css';

/**
 * Dispensing desk at /dispensing. The queue below is the live `/work/dispenses`
 * work queue (RX_ISSUED → RX_VERIFIED by a named pharmacist → PACKED →
 * OUT_FOR_DELIVERY → DELIVERED / RETURNED). The local dispense register stays
 * at /dispense-register.
 * Student handover-OTP verification has no backend yet, so it is not offered:
 * a check that cannot run must not show "verified" (fail closed).
 */
export function PharmacyDispensingScreen({ onNavigate }: { onNavigate?: (target: RoutePath) => void }) {
  const t = useT();
  const go = (target: RoutePath) => (onNavigate ? onNavigate(target) : navigate(target));
  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <nav className="wf-row-actions" aria-label={t('partner.dispensing.navLabel')} style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => go('vendor')}>{t('partner.vhome.nav.home')}</button>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => go('dispense-register')}>{t('partner.vhome.nav.dispense')}</button>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => go('returns')}>{t('partner.vhome.nav.returns')}</button>
      </nav>

      <p className="wf-fineprint" role="status" style={{ marginBottom: 24 }}>{t('partner.dispensing.otpNote')}</p>

      {/* The panel carries its own translated heading. */}
      <PharmacyQueuePanel />
    </div>
  );
}
