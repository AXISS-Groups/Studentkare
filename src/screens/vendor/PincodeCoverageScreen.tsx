import React, { useState } from 'react';
import { MapPin, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ProviderDirectoryPanel } from '../workspace/FulfilmentQueuePanel';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function PincodeCoverageScreen() {
  const [pincodes, setPincodes] = useState([
    { code: '502285', location: 'Kandi / Sangareddy (IIT Hyderabad)', deliverySla: '30 mins', status: 'ACTIVE' },
    { code: '500032', location: 'Gachibowli / Financial District', deliverySla: '45 mins', status: 'ACTIVE' }
  ]);

  const [newPincode, setNewPincode] = useState('');

  const handleAddPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPincode.length === 6) {
      setPincodes([...pincodes, { code: newPincode, location: 'Custom Pincode Zone', deliverySla: '60 mins', status: 'ACTIVE' }]);
      setNewPincode('');
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">SERVICEABLE ZONES</span>
          <h2>Vendor Pincode Delivery Coverage Map</h2>
          <p>Configure serviceable pincodes, delivery SLA promises, and home sample collection zones.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} /> Active Serviceable Pincodes ({pincodes.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pincodes.map((p, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface-card, #fff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{p.code}</strong> — {p.location}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>SLA Promise: <strong>{p.deliverySla}</strong></p>
                  </div>
                  <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    ACTIVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Add Service Pincode</h3>
          <form onSubmit={handleAddPincode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="6-Digit Indian Pincode">
              <input type="text" inputMode="numeric" maxLength={6} value={newPincode} onChange={e => setNewPincode(e.target.value.replace(/\D/g, ''))} placeholder="500081" required />
            </Field>
            <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44 }} disabled={newPincode.length !== 6}>
              Add Pincode Zone
            </button>
          </form>
        </div>
      </div>

      <ProviderDirectoryPanel kind="PHARMACY" />
    </div>
  );
}
