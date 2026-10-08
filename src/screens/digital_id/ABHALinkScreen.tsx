import React from 'react';
import { CreditCard } from 'lucide-react';

/**
 * ABHA linking is not built. There is no ABDM/ABHA integration in the backend
 * (no route, model or column), so this screen previously simulated an OTP flow
 * that "linked" any input after a timeout and showed a fabricated ABHA profile.
 * Guardrail 6 forbids asserting an integration state that is not backed by
 * evidence, so the screen now states plainly that linking is unavailable and
 * collects nothing.
 */
export const ABHALinkScreen: React.FC = () => {
  return (
    <div className="wf-card" role="status" style={{ maxWidth: '640px', margin: '24px auto', padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '14px' }}>
        <CreditCard aria-hidden="true" style={{ color: 'var(--text-3)', width: '28px', height: '28px' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>ABHA linking</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Not available yet</span>
        </div>
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
        Studentkare is not connected to the Ayushman Bharat Digital Mission (ABDM) today, so it cannot link an ABHA number or
        pull records from other hospitals, labs or clinics. Your Studentkare records stay in your Studentkare account.
      </p>
    </div>
  );
};
