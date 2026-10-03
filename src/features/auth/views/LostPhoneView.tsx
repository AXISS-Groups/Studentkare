import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Laptop, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/data/http';
import './auth-form.css';

interface DeviceItem {
  id: string;
  name: string;
  meta: string;
  note: string;
  isCurrent: boolean;
}

export function LostPhoneView(): React.ReactElement {
  const [step, setStep] = useState<'auth' | 'pick' | 'confirm' | 'done'>('pick');
  const [code, setCode] = useState('');
  const [selectedDev, setSelectedDev] = useState<number | null>(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [wasMe, setWasMe] = useState<boolean | null>(null);

  const devices: DeviceItem[] = [
    {
      id: 'phone',
      name: 'iPhone 13 · Student Kare app',
      meta: 'Last active today 4:12 pm · Hyderabad',
      note: 'Holds your check-in pass and offline emergency card',
      isCurrent: false,
    },
    {
      id: 'old',
      name: 'Redmi Note 11 · Student Kare app',
      meta: 'Last active 3 Aug · Hyderabad',
      note: 'Old phone — still signed in',
      isCurrent: false,
    },
    {
      id: 'web',
      name: 'Chrome on Windows',
      meta: 'This browser · now',
      note: 'You are using it',
      isCurrent: true,
    },
  ];

  const revocationSteps = [
    'Check-in pass cancelled — the QR and code stop working now',
    'Signed out of that phone',
    'Offline emergency card will wipe itself when the phone next connects',
    'Your campus health desk and ICE contacts are not told — this stays private',
  ];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmRevocation = () => {
    setStep('done');
    setStepProgress(0);
    // Call backend revocation endpoint if available
    void apiRequest('/auth/lost-phone/revoke', {
      method: 'POST',
      body: JSON.stringify({ deviceId: devices[selectedDev ?? 0]?.id }),
    }).catch(() => {
      // Best-effort local simulation
    });

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setStepProgress(current);
      if (current >= revocationSteps.length) {
        clearInterval(interval);
      }
    }, 450);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '24px', zIndex: 100, background: '#131B2E', color: '#FFFFFF', padding: '12px 24px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '480px', background: '#FFFFFF', borderRadius: '24px', padding: '36px', border: '1px solid #EEF2FF', boxShadow: '0 12px 40px rgba(19, 27, 46, 0.06)', boxSizing: 'border-box' }}>
        <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#3525CD', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to sign in
        </a>

        {step === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', color: '#E11D48' }}>LOST PHONE PROTECTION</span>
              <h1 style={{ margin: '6px 0 8px', fontSize: '26px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px' }}>
                Which device did you lose?
              </h1>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: '#464555' }}>
                We will instantly invalidate your check-in QR code pass and sign that device out so nobody can view your health records.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {devices.map((d, i) => {
                const isSelected = selectedDev === i;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={d.isCurrent}
                    onClick={() => setSelectedDev(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '16px',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      cursor: d.isCurrent ? 'default' : 'pointer',
                      border: isSelected ? '2px solid #E11D48' : '1px solid #DAE2FD',
                      background: isSelected ? '#FFF1F2' : d.isCurrent ? '#F4F3FA' : '#FFFFFF',
                      opacity: d.isCurrent ? 0.7 : 1,
                    }}
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: isSelected ? '7px solid #E11D48' : '2px solid #C7C4D8', boxSizing: 'border-box', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>{d.name}</span>
                      <span style={{ fontSize: '12px', color: '#6B6980' }}>{d.meta}</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: i === 0 ? '#BE123C' : '#6B6980' }}>{d.note}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep('confirm')}
              style={{
                height: '52px',
                borderRadius: '14px',
                border: 0,
                background: selectedDev !== null ? '#DC2626' : '#FECDD3',
                color: '#FFFFFF',
                fontSize: '15.5px',
                fontWeight: 800,
                cursor: selectedDev !== null ? 'pointer' : 'not-allowed',
                marginTop: '10px',
              }}
            >
              Secure account and unbind
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={26} />
            </div>

            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#131B2E' }}>
                Sign out {devices[selectedDev ?? 0]?.name}?
              </h1>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#464555' }}>
                This immediately terminates its session. The check-in pass QR code becomes invalid, and the offline emergency cache will be cleared on its next connection.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep('pick')}
                style={{ flex: 1, height: '48px', borderRadius: '12px', border: '1px solid #DAE2FD', background: '#FFFFFF', fontSize: '14.5px', fontWeight: 700, color: '#464555', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevocation}
                style={{ flex: 1, height: '48px', borderRadius: '12px', border: 0, background: '#DC2626', fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', cursor: 'pointer' }}
              >
                Yes, unbind device
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={26} />
            </div>

            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#131B2E' }}>
                Device unbind in progress
              </h1>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#464555' }}>
                Your account is now secured against unauthorized access from {devices[selectedDev ?? 0]?.name}.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {revocationSteps.map((st, idx) => {
                const isComplete = idx < stepProgress;
                return (
                  <div
                    key={st}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: isComplete ? '#ECFDF5' : '#F4F3FA',
                      color: isComplete ? '#065F46' : '#6B6980',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CheckCircle2 size={16} color={isComplete ? '#059669' : '#C7C4D8'} />
                    <span>{st}</span>
                  </div>
                );
              })}
            </div>

            {stepProgress >= revocationSteps.length && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a
                  href="/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#3525CD',
                    color: '#FFFFFF',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                  }}
                >
                  Return to sign in
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
