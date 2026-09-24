import React, { useState } from 'react';
import { Lock, Send, CheckCircle2, ShieldAlert } from 'lucide-react';

interface StudentHealthAccessRequestModalProps {
  onClose?: () => void;
}

export const StudentHealthAccessRequestModal: React.FC<StudentHealthAccessRequestModalProps> = ({ onClose }) => {
  const [studentSearch, setStudentSearch] = useState<string>('Aarav Mehta (2024-CS-102)');
  const [purpose, setPurpose] = useState<string>('Campus Health Camp Screening Verification');
  const [fields, setFields] = useState<string[]>(['Vaccination Status']);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const availableFields = ['Vaccination Status', 'Allergies & Conditions', 'Vitals Summary', 'Lab Test Reports'];

  const toggleField = (field: string) => {
    setFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSubmitRequest = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      if (onClose) onClose();
    }, 2500);
  };

  return (
    <div className="wf-card" style={{ maxWidth: '600px', margin: '20px auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--rule)', paddingBottom: '12px' }}>
        <Lock style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Request Student Health Data Access</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Consent-based request. Student must approve before data is visible (DPDP Rule L).</span>
        </div>
      </div>

      {isSubmitted ? (
        <div style={{ background: 'var(--positive-fill)', color: '#064e3b', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
          <CheckCircle2 size={24} style={{ marginBottom: '8px' }} />
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Consent Request Sent to Student</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>The student will receive an in-app notification to review and grant/deny your request.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Target Student</label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Stated Purpose of Request</label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Verification of mandatory hepatitis vaccination prior to health camp..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Select Specific Fields</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {availableFields.map((f) => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fields.includes(f)}
                    onChange={() => toggleField(f)}
                  />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Access Duration</label>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {onClose && (
              <button className="wf-btn-secondary" onClick={onClose} style={{ flex: 1, padding: '10px' }}>
                Cancel
              </button>
            )}
            <button
              className="wf-btn-primary"
              disabled={fields.length === 0 || !purpose}
              onClick={handleSubmitRequest}
              style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Send size={16} />
              <span>Send Consent Request</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
