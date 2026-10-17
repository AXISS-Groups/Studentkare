import React, { useState } from 'react';
import { Info, Send } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

const SPECIALTIES = ['CARDIOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'DERMATOLOGY', 'PSYCHIATRY'] as const;

/**
 * No referral endpoint exists. This form used to announce "Referral
 * Dispatched to Patient Vault!" for two seconds while sending nothing, so a
 * doctor could believe a referral had gone out. It now says it cannot send.
 */
export function DoctorSpecialistReferralScreen() {
  const t = useT();
  const [specialty, setSpecialty] = useState<string>('CARDIOLOGY');
  const [hospital, setHospital] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.referral.eyebrow')}</span>
          <h2>{t('partner.clin.referral.title')}</h2>
          <p>{t('partner.clin.referral.intro')}</p>
        </div>
      </div>

      <div className="wf-notice" role="note" style={{ marginBottom: 16 }}>
        <Info size={18} aria-hidden="true" />
        <span>{t('partner.clin.referral.notConnected')}</span>
      </div>

      <div className="wf-card" style={{ padding: 24 }}>
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={t('partner.clin.referral.specialty')}>
              <select value={specialty} onChange={e => setSpecialty(e.target.value)}>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{t(`partner.clin.referral.spec.${s}` as MessageKey)}</option>)}
              </select>
            </Field>

            <Field label={t('partner.clin.referral.hospital')}>
              <input type="text" value={hospital} onChange={e => setHospital(e.target.value)} required />
            </Field>
          </div>

          <Field label={t('partner.clin.referral.notes')}>
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} required />
          </Field>

          <button className="health-button health-button-primary" type="submit" disabled style={{ minHeight: 44, width: 'fit-content' }}>
            <Send size={16} aria-hidden="true" /> {t('partner.clin.referral.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
