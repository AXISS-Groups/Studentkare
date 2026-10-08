import React from 'react';
import { QrCode } from 'lucide-react';
import type { MemberProfile } from '../../data/workflowTypes';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

const NOT_ADDED = 'Not added yet';

/**
 * Emergency health passport. Every value shown comes from the member's own saved
 * profile (`/profile`). Nothing is filled in on the member's behalf: a field the
 * member has not saved is shown as "Not added yet". If the profile cannot load,
 * the error state is shown — never a placeholder passport.
 */
export function HealthPassportQRScreen() {
  const resource = useApiResource<MemberProfile>('/profile');

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DIGITAL HEALTH IDENTIFIER</span>
          <h2>Campus Health Passport & Emergency QR</h2>
          <p>Your blood group, allergies and emergency contact, exactly as saved in your profile.</p>
        </div>
      </div>

      <DataState {...resource} retry={resource.reload}>
        {resource.data && <PassportCard profile={resource.data} />}
      </DataState>
    </div>
  );
}

function PassportCard({ profile }: { profile: MemberProfile }) {
  const hasContact = profile.emergencyContactName.trim() !== '' || profile.emergencyContactPhone.trim() !== '';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
      <div className="wf-card" style={{
        padding: 24,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>STUDENTKARE HEALTH PASSPORT</span>
            <h3 style={{ fontSize: 22, marginTop: 4, color: '#fff' }}>{profile.fullName || NOT_ADDED}</h3>
            <p style={{ fontSize: 13, color: '#cbd5e1', margin: '2px 0' }}>{profile.university || 'Campus not added yet'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>BLOOD GROUP</span>
            <strong style={{ fontSize: 18, color: '#f87171' }}>{profile.bloodGroup || NOT_ADDED}</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>KNOWN ALLERGIES</span>
            <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>{profile.allergies.length > 0 ? profile.allergies.join(', ') : 'No allergies added yet'}</span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 8 }}>EMERGENCY CONTACT</span>
          {hasContact ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>{profile.emergencyContactName || NOT_ADDED}{profile.emergencyContactRelation && <small style={{ color: '#94a3b8' }}> ({profile.emergencyContactRelation})</small>}</span>
              <strong style={{ color: '#60a5fa' }}>{profile.emergencyContactPhone || NOT_ADDED}</strong>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>No emergency contact yet. Add one in your profile.</p>
          )}
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24, textAlign: 'center' }}>
        <span className="care-eyebrow">FIRST RESPONDER SCAN</span>
        <div aria-hidden="true" style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)', margin: '12px 0 16px', display: 'inline-block', opacity: 0.4 }}>
          <QrCode size={160} color="#0f172a" style={{ margin: '0 auto' }} />
        </div>
        <p role="status" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 0 }}>
          A scannable passport QR isn’t available yet. Nothing has been shared.
        </p>
      </div>
    </div>
  );
}
