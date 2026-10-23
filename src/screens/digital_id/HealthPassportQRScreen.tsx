import React from 'react';
import { QrCode } from 'lucide-react';
import type { MemberProfile } from '../../data/types/workflowTypes';
import { useApiResource } from '../../hooks/api/useApiResource';
import { DataState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

/**
 * Emergency health passport. Every value shown comes from the member's own saved
 * profile (`/profile`). Nothing is filled in on the member's behalf: a field the
 * member has not saved is shown as "Not added yet". If the profile cannot load,
 * the error state is shown — never a placeholder passport.
 */
export function HealthPassportQRScreen() {
  const t = useT();
  const resource = useApiResource<MemberProfile>('/profile');

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('member.passport.eyebrow')}</span>
          <h2>{t('member.passport.title')}</h2>
          <p>{t('member.passport.body')}</p>
        </div>
      </div>

      <DataState {...resource} retry={resource.reload}>
        {resource.data && <PassportCard profile={resource.data} />}
      </DataState>
    </div>
  );
}

function PassportCard({ profile }: { profile: MemberProfile }) {
  const t = useT();
  const notAdded = t('member.passport.notAdded');
  const hasContact = profile.emergencyContactName.trim() !== '' || profile.emergencyContactPhone.trim() !== '';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
      <div className="wf-card" style={{
        padding: 24,
        borderRadius: 16,
        background: 'var(--sk-color-sidebar)',
        color: 'var(--sk-color-sidebar-ink)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--sk-color-sidebar-ink-3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('member.passport.cardTag')}</span>
            <h3 style={{ fontSize: 22, marginTop: 4, color: 'var(--sk-color-sidebar-ink)' }}>{profile.fullName || notAdded}</h3>
            <p style={{ fontSize: 13, color: 'var(--sk-color-sidebar-ink-2)', margin: '2px 0' }}>{profile.university || t('member.passport.campusNotAdded')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--sk-color-sidebar-ink-3)', display: 'block' }}>{t('member.passport.bloodGroup')}</span>
            <strong style={{ fontSize: 18, color: 'var(--sk-color-sidebar-ink)' }}>{profile.bloodGroup || notAdded}</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--sk-color-sidebar-ink-3)', display: 'block' }}>{t('member.passport.allergies')}</span>
            <span style={{ fontSize: 13, color: 'var(--sk-color-sidebar-ink)', fontWeight: 600 }}>{profile.allergies.length > 0 ? profile.allergies.join(', ') : t('member.passport.noAllergies')}</span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, color: 'var(--sk-color-sidebar-ink-3)', display: 'block', marginBottom: 8 }}>{t('member.passport.contact')}</span>
          {hasContact ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>{profile.emergencyContactName || notAdded}{profile.emergencyContactRelation && <small style={{ color: 'var(--sk-color-sidebar-ink-3)' }}> ({profile.emergencyContactRelation})</small>}</span>
              <strong style={{ color: 'var(--sk-color-sidebar-ink-2)' }}>{profile.emergencyContactPhone || notAdded}</strong>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--sk-color-sidebar-ink-2)', margin: 0 }}>{t('member.passport.noContact')}</p>
          )}
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24, textAlign: 'center' }}>
        <span className="care-eyebrow">{t('member.passport.scanEyebrow')}</span>
        <div aria-hidden="true" style={{ background: 'var(--sk-color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--sk-color-rule)', margin: '12px 0 16px', display: 'inline-block', opacity: 0.4 }}>
          <QrCode size={160} style={{ margin: '0 auto', color: 'var(--sk-color-text)' }} />
        </div>
        <p role="status" style={{ fontSize: 12, color: 'var(--sk-color-text-2)', marginBottom: 0 }}>
          {t('member.passport.qrUnavailable')}
        </p>
      </div>
    </div>
  );
}
