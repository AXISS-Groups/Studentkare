import React, { useState } from 'react';
import { Pill, KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { PharmacyQueuePanel } from '../workspace/FulfilmentQueuePanel';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function PharmacyDispensingScreen() {
  const [otpModal, setOtpModal] = useState<{ open: boolean; rxId?: string; studentName?: string }>({ open: false });
  const [otpValue, setOtpValue] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length === 6) {
      setVerifiedSuccess(true);
      setTimeout(() => {
        setVerifiedSuccess(false);
        setOtpModal({ open: false });
        setOtpValue('');
      }, 1500);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">PHARMACY FULFILMENT WORKSPACE</span>
          <h2>Prescription Dispensing Desk</h2>
          <p>Verify clinician licenses, dispense medications securely, and log student OTP delivery proofs.</p>
        </div>

        <button 
          className="health-button health-button-primary"
          style={{ minHeight: 44 }}
          onClick={() => setOtpModal({ open: true, rxId: 'RX-889120', studentName: 'Aarav Sharma' })}
        >
          <KeyRound size={16} /> Verify Student Handover OTP
        </button>
      </div>

      {/* OTP Modal */}
      {otpModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="wf-card" style={{ width: '100%', maxWidth: 420, padding: 24, background: 'var(--surface-card, #fff)' }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Verify Student OTP</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Student <strong>{otpModal.studentName}</strong> presents a 6-digit verification OTP in their Health Vault app to authorize handover.
            </p>

            {verifiedSuccess ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#10b981' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 8px' }} />
                <strong>OTP Verified Successfully!</strong>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dispense proof recorded on ABDM ledger.</p>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="6-Digit Handover OTP">
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    maxLength={6} 
                    value={otpValue} 
                    onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 482910"
                    autoFocus
                    required
                  />
                </Field>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="health-button" 
                    style={{ minHeight: 44 }}
                    onClick={() => setOtpModal({ open: false })}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="health-button health-button-primary" 
                    style={{ minHeight: 44 }}
                    disabled={otpValue.length !== 6}
                  >
                    Confirm Handover
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Dispensing Queue Panel */}
      <PharmacyQueuePanel />
    </div>
  );
}
