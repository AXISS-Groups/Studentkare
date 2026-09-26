import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function GenericSubstitutionScreen() {
  const [prescribed, setPrescribed] = useState('Augmentin 625mg');
  const [proposed, setProposed] = useState('Amoxyclav 625mg (Generic)');
  const [reason, setReason] = useState('Brand out of stock; exact salt and strength match available.');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">CLINICIAN APPROVAL REQUIRED</span>
          <h2>Generic Drug Substitution Proposal</h2>
          <p>Propose generic medicine swaps to the prescribing doctor when brand stock is unavailable.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Prescribed Brand / Medicine">
              <input type="text" value={prescribed} onChange={e => setPrescribed(e.target.value)} required />
            </Field>
            <Field label="Proposed Generic Equivalent">
              <input type="text" value={proposed} onChange={e => setProposed(e.target.value)} required />
            </Field>
          </div>

          <Field label="Reason for Substitution">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} required />
          </Field>

          <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
            <Send size={16} /> {submitted ? 'Submitted to Doctor Inbox!' : 'Send Swap Proposal to Prescriber'}
          </button>
        </form>
      </div>
    </div>
  );
}
