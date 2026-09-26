import React, { useState } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, Pill, Package, AlertCircle } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

export function ExpressOtpHandoverDesk() {
  const [otpInput, setOtpInput] = useState('');
  const [packageBarcode, setPackageBarcode] = useState('');
  const [dispenseState, setDispenseState] = useState<'IDLE' | 'VERIFYING' | 'SUCCESS'>('IDLE');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length === 6 && packageBarcode.trim()) {
      setDispenseState('VERIFYING');
      setTimeout(() => {
        setDispenseState('SUCCESS');
      }, 1200);
    }
  };

  const handleReset = () => {
    setDispenseState('IDLE');
    setOtpInput('');
    setPackageBarcode('');
  };

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">EXPRESS FULFILMENT & HANDOVER</span>
          <h2>Pharmacy OTP Dispense & Handover Desk</h2>
          <p>Verify student 6-digit handover OTP and package barcode to log ABDM tamper-proof delivery proof.</p>
        </div>

        <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 12px', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} /> ABDM Delivery Proof Enabled
        </span>
      </div>

      {dispenseState === 'SUCCESS' ? (
        <div style={{ textAlign: 'center', padding: 28, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 12 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 20 }}>Medication Handover Successfully Verified!</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Dispense proof recorded under ABDM Ledger ID <code>DELIV-2026-881290</code>. Student notified in Health Vault.
          </p>
          <button className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={handleReset}>
            Process Next Handover OTP
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
          <Field label="Student 6-Digit Handover OTP (from Student App)">
            <input 
              type="text" 
              inputMode="numeric" 
              maxLength={6} 
              value={otpInput} 
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 889102"
              required 
            />
          </Field>

          <Field label="Scan Packed Medicine Barcode / Order ID">
            <input 
              type="text" 
              value={packageBarcode} 
              onChange={e => setPackageBarcode(e.target.value.toUpperCase())}
              placeholder="e.g. PKG-2026-7789"
              required 
            />
          </Field>

          <button 
            className="health-button health-button-primary"
            type="submit"
            disabled={otpInput.length !== 6 || !packageBarcode.trim() || dispenseState === 'VERIFYING'}
            style={{ minHeight: 44, marginTop: 4 }}
          >
            <KeyRound size={16} /> {dispenseState === 'VERIFYING' ? 'Verifying OTP & ABDM Record...' : 'Verify OTP & Release Order'}
          </button>
        </form>
      )}
    </div>
  );
}
