import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function GenericSubstitutionScreen() {
  const [prescribed, setPrescribed] = useState('');
  const [proposed, setProposed] = useState('');
  const [reason, setReason] = useState('');

  // There is no prescriber-inbox endpoint for substitution proposals yet, so
  // nothing is sent and nothing claims to have been sent (fail closed).
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

          <p className="wf-fineprint" id="generic-sub-unavailable" role="status">Sending substitution proposals to the prescriber isn’t available yet. Nothing is sent from this form.</p>
          <button className="health-button health-button-primary" type="submit" disabled aria-describedby="generic-sub-unavailable" style={{ minHeight: 44, width: 'fit-content' }}>
            <Send size={16} /> Send Swap Proposal to Prescriber
          </button>
        </form>
      </div>
    </div>
  );
}
