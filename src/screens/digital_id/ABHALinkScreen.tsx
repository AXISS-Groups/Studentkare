import React from 'react';
import { CreditCard } from 'lucide-react';
import { useT } from '@/i18n';

/**
 * ABHA linking is not built. There is no ABDM/ABHA integration in the backend
 * (no route, model or column), so this screen previously simulated an OTP flow
 * that "linked" any input after a timeout and showed a fabricated ABHA profile.
 * Guardrail 6 forbids asserting an integration state that is not backed by
 * evidence, so the screen now states plainly that linking is unavailable and
 * collects nothing.
 */
export const ABHALinkScreen: React.FC = () => {
  const t = useT();
  return (
    <div className="wf-card" role="status" style={{ maxWidth: '640px', margin: '24px auto', padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--sk-color-rule)', paddingBottom: '14px' }}>
        <CreditCard aria-hidden="true" style={{ color: 'var(--sk-color-text-3)', width: '28px', height: '28px' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('member.abha.title')}</h2>
          <span style={{ fontSize: '13px', color: 'var(--sk-color-text-3)' }}>{t('member.abha.status')}</span>
        </div>
      </div>
      <p style={{ color: 'var(--sk-color-text-2)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
        {t('member.abha.body')}
      </p>
    </div>
  );
};
