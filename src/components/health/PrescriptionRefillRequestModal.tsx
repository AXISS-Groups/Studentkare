import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

interface RefillProps {
  onClose?: () => void;
  onRefillRequested?: (refillId: string) => void;
}

export function PrescriptionRefillRequestModal({ onClose, onRefillRequested }: RefillProps) {
  const [selectedMed, setSelectedMed] = useState('Paracetamol 650mg & Cetirizine 10mg (Chronic Allergy Maintenance)');
  const [refillReason, setRefillReason] = useState('Current 30-day supply running low (2 days remaining). Symptoms stable.');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmitRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (refillReason.trim()) {
      const generatedId = `REFILL-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedId(generatedId);
      onRefillRequested?.(generatedId);
    }
  };

  return (
    <div className="wf-card" style={{ padding: 24, maxWidth: 540, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">CHRONIC CARE REFILL MANAGER</span>
          <h2>1-Tap Prescription Refill Request</h2>
          <p>Request clinician re-authorization for ongoing chronic maintenance prescriptions.</p>
        </div>
      </div>

      {submittedId ? (
        <div style={{ textAlign: 'center', padding: 24, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 12 }}>
          <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: 18 }}>Refill Request Sent to Prescribing Doctor!</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Request ID: <code>{submittedId}</code> · Dr. V. Prasad will review and digitally re-sign.
          </p>
          <button className="health-button health-button-primary" style={{ minHeight: 40 }} onClick={onClose}>
            Done / Back to Vault
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitRefill} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Select Medication for Refill">
            <select value={selectedMed} onChange={e => setSelectedMed(e.target.value)}>
              <option value="Paracetamol 650mg & Cetirizine 10mg (Chronic Allergy Maintenance)">Paracetamol 650mg & Cetirizine 10mg (Chronic Maintenance)</option>
              <option value="Seretide Inhaler 125mcg (Asthma Care)">Seretide Inhaler 125mcg (Asthma Care)</option>
              <option value="Pantoprazole 40mg (Gastro Care)">Pantoprazole 40mg (Gastro Care)</option>
            </select>
          </Field>

          <Field label="Refill Justification / Symptom Status">
            <textarea rows={3} value={refillReason} onChange={e => setRefillReason(e.target.value)} required />
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            {onClose && (
              <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="health-button health-button-primary" style={{ minHeight: 44 }}>
              <Send size={16} /> Send Refill Request to Doctor
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
