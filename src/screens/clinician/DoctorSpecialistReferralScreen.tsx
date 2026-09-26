import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function DoctorSpecialistReferralScreen() {
  const [specialty, setSpecialty] = useState('CARDIOLOGY');
  const [hospital, setHospital] = useState('Continental Hospitals, Gachibowli');
  const [reason, setReason] = useState('Persistent sinus tachycardia and chest discomfort during physical exertion.');
  const [sent, setSent] = useState(false);

  const handleReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason) {
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">TERTIARY CARE DISPATCH</span>
          <h2>Specialist Referral & Hospital Desk</h2>
          <p>Issue formal clinical referral notes to empanelled super-specialty hospitals and tertiary care centers.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24 }}>
        <form onSubmit={handleReferral} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Target Specialty">
              <select value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option value="CARDIOLOGY">Cardiology</option>
                <option value="NEUROLOGY">Neurology</option>
                <option value="ORTHOPEDICS">Orthopedics</option>
                <option value="DERMATOLOGY">Dermatology</option>
                <option value="PSYCHIATRY">Psychiatry</option>
              </select>
            </Field>

            <Field label="Empanelled Hospital / Facility">
              <input type="text" value={hospital} onChange={e => setHospital(e.target.value)} required />
            </Field>
          </div>

          <Field label="Clinical Referral Notes & Summary">
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} required />
          </Field>

          <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
            <Send size={16} /> {sent ? 'Referral Dispatched to Patient Vault!' : 'Issue Referral Note'}
          </button>
        </form>
      </div>
    </div>
  );
}
