import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';

export const ABHALinkScreen: React.FC = () => {
  const [abhaAddress, setAbhaAddress] = useState<string>('91-9876-5432-1098');
  const [step, setStep] = useState<'IDLE' | 'OTP_SENT' | 'LINKED'>('IDLE');
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [linkedData, setLinkedData] = useState<any>(null);

  const handleSendOtp = () => {
    if (!abhaAddress) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('OTP_SENT');
    }, 1200);
  };

  const handleVerifyOtp = () => {
    if (!otp) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('LINKED');
      setLinkedData({
        abhaNumber: '91-9876-5432-1098',
        name: 'Rahul Sharma',
        gender: 'M',
        dob: '2004-05-14',
        linkedRecordsCount: 3,
        status: 'ACTIVE_SANDBOX',
      });
    }, 1500);
  };

  return (
    <div className="wf-card" style={{ maxWidth: '640px', margin: '24px auto', padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '14px' }}>
        <CreditCard style={{ color: 'var(--action)', width: '28px', height: '28px' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>ABHA Digital Health ID Link</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Ayushman Bharat Digital Mission (ABDM) Gateway Integration</span>
        </div>
      </div>

      {step === 'IDLE' && (
        <div>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            Link your 14-digit ABHA Number or ABHA Address to securely pull health records from hospitals, labs, and clinics nationwide.
          </p>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>ABHA Number / Address</label>
            <input
              type="text"
              value={abhaAddress}
              onChange={(e) => setAbhaAddress(e.target.value)}
              placeholder="e.g. 91-9876-5432-1098 or username@abha"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>
          <button
            className="wf-btn-primary"
            disabled={isLoading || !abhaAddress}
            onClick={handleSendOtp}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <span>Request ABDM OTP</span>}
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 'OTP_SENT' && (
        <div>
          <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-2)' }}>
            OTP sent to the mobile number registered with your ABHA ID (Aadhaar / Mobile OTP).
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Enter 6-Digit ABDM OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="e.g. 582910"
              maxLength={6}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
            />
          </div>
          <button
            className="wf-btn-primary"
            disabled={isLoading || otp.length < 6}
            onClick={handleVerifyOtp}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            <span>Verify & Link ABHA Account</span>
          </button>
        </div>
      )}

      {step === 'LINKED' && linkedData && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--positive-fill)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <CheckCircle2 style={{ color: 'var(--positive)', width: '24px', height: '24px' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>ABHA Account Linked Successfully</h4>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>ABDM Sandbox Connected • Sandbox Token Active</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '14px', borderRadius: '8px' }}>
            <div><strong>ABHA Number:</strong> {linkedData.abhaNumber}</div>
            <div><strong>Registered Name:</strong> {linkedData.name}</div>
            <div><strong>Gender / DOB:</strong> {linkedData.gender} • {linkedData.dob}</div>
            <div><strong>Pulled Records:</strong> {linkedData.linkedRecordsCount} clinical artifacts synced to Vault</div>
          </div>

          <button
            className="wf-btn-secondary"
            onClick={() => setStep('IDLE')}
            style={{ marginTop: '16px', width: '100%', padding: '10px' }}
          >
            Manage ABDM Consent Artifacts
          </button>
        </div>
      )}
    </div>
  );
};
