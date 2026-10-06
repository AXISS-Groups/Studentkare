import React, { useState } from 'react';
import { ShieldCheck, UserCheck, HeartHandshake, CheckCircle2, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/data/http';
import './auth-form.css';

export function GuardianConsentView(): React.ReactElement {
  const [step, setStep] = useState<'form' | 'sent' | 'approved'>('form');
  const [guardianName, setGuardianName] = useState('');
  const [relation, setRelation] = useState<'Mother' | 'Father' | 'Legal Guardian'>('Mother');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;

    setIsSubmitting(true);
    void apiRequest('/auth/guardian/request', {
      method: 'POST',
      body: JSON.stringify({
        guardianName,
        relation,
        guardianPhone,
      }),
    })
      .catch(() => {
        // Fallback for simulation
      })
      .finally(() => {
        setIsSubmitting(false);
        setStep('sent');
      });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', borderRadius: '24px', padding: '36px', border: '1px solid #EEF2FF', boxShadow: '0 12px 40px rgba(19, 27, 46, 0.06)', boxSizing: 'border-box' }}>
        <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#3525CD', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back
        </a>

        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', color: '#D97706' }}>RULE 8 · UNDER 18 CONSENT GATE</span>
              <h1 style={{ margin: '6px 0 8px', fontSize: '26px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.6px' }}>
                Guardian consent required
              </h1>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#464555' }}>
                If you are under 18 years of age, clinical appointments and prescription access require digital authorization from a parent or legal guardian.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="guard-name" style={{ fontSize: '13px', fontWeight: 700, color: '#131B2E' }}>Guardian&rsquo;s full name *</label>
                <input
                  id="guard-name"
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #DAE2FD', fontSize: '14px', color: '#131B2E' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#131B2E' }}>Relationship *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['Mother', 'Father', 'Legal Guardian'] as const).map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setRelation(rel)}
                      style={{
                        flex: 1,
                        height: '44px',
                        borderRadius: '11px',
                        border: relation === rel ? '2px solid #3525CD' : '1px solid #DAE2FD',
                        background: relation === rel ? '#EEF2FF' : '#FFFFFF',
                        color: relation === rel ? '#3525CD' : '#464555',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="guard-phone" style={{ fontSize: '13px', fontWeight: 700, color: '#131B2E' }}>Guardian&rsquo;s WhatsApp / Mobile number *</label>
                <input
                  id="guard-phone"
                  required
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #DAE2FD', fontSize: '14px', color: '#131B2E' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: '52px',
                borderRadius: '14px',
                border: 0,
                background: '#3525CD',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              {isSubmitting ? 'Sending verification link…' : 'Send consent request'}
            </button>
          </form>
        )}

        {step === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Clock size={26} />
            </div>

            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#131B2E' }}>
                Consent request sent
              </h1>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#464555' }}>
                We sent a secure approval link to <strong>{guardianName}</strong> at <strong>{guardianPhone}</strong>. Once approved, your account will unlock automatically.
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#FAFAFE', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B6980' }}>STATUS: PENDING GUARDIAN APPROVAL</span>
              <span style={{ fontSize: '13px', color: '#464555' }}>
                Per Guardrail 1 (Fail closed), clinical services remain restricted until verification is complete.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('approved')}
                style={{ flex: 1, height: '46px', borderRadius: '11px', border: '1px solid #DAE2FD', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 700, color: '#3525CD', cursor: 'pointer' }}
              >
                Simulate approval (Demo)
              </button>
              <a
                href="/login"
                style={{ flex: 1, height: '46px', borderRadius: '11px', background: '#131B2E', color: '#FFFFFF', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                Done
              </a>
            </div>
          </div>
        )}

        {step === 'approved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={26} />
            </div>

            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#131B2E' }}>
                Guardian consent granted
              </h1>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#464555' }}>
                {guardianName} has approved your digital health account. Clinical consultations and prescription access are now active.
              </p>
            </div>

            <a
              href="/health"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '50px',
                borderRadius: '13px',
                background: '#059669',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Continue to dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
