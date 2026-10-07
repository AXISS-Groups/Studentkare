import React from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import './auth-form.css';

interface VerifyGateViewProps {
  onClose?: () => void;
  serviceName?: string;
}

export function VerifyGateView({ onClose, serviceName = 'this clinical service' }: VerifyGateViewProps): React.ReactElement {
  return (
    <div style={{ minHeight: '100vh', background: 'rgba(19, 27, 46, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', borderRadius: '24px', padding: '36px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ position: 'absolute', top: '20px', right: '20px', border: 0, background: 'transparent', cursor: 'pointer', color: '#6B6980' }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3525CD' }}>
          <ShieldAlert size={28} />
        </div>

        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.2px', color: '#4F46E5' }}>VERIFICATION REQUIRED</span>
          <h1 style={{ margin: '6px 0 8px', fontSize: '26px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.6px' }}>
            Verify your identity to proceed
          </h1>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#464555' }}>
            Under clinical governance regulations and campus safety rules, access to {serviceName} requires a verified campus student profile.
          </p>
        </div>

        <div style={{ padding: '16px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#131B2E' }}>What is needed (takes ~2 minutes):</span>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#464555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Campus student email verification</li>
            <li>College roll number or ID photo</li>
            <li>Selfie liveness check</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, height: '50px', borderRadius: '13px', border: '1px solid #DAE2FD', background: '#FFFFFF', fontSize: '14.5px', fontWeight: 700, color: '#464555', cursor: 'pointer' }}
            >
              Not now
            </button>
          )}
          <a
            href="/verify"
            style={{
              flex: 2,
              height: '50px',
              borderRadius: '13px',
              background: '#3525CD',
              color: '#FFFFFF',
              fontSize: '14.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            Start verification <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
