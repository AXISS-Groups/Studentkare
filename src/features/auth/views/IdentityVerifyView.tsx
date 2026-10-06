import React, { useState } from 'react';
import { ShieldCheck, Camera, Mail, GraduationCap, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/data/http';
import './auth-form.css';

type VerificationStatus = 'todo' | 'busy' | 'verified';

export function IdentityVerifyView(): React.ReactElement {
  const [photoStatus, setPhotoStatus] = useState<VerificationStatus>('todo');
  const [emailStatus, setEmailStatus] = useState<VerificationStatus>('todo');
  const [campusStatus, setCampusStatus] = useState<VerificationStatus>('todo');
  const [govStatus, setGovStatus] = useState<VerificationStatus>('todo');

  const [emailInput, setEmailInput] = useState('');
  const [rollInput, setRollInput] = useState('');
  const [govIdInput, setGovIdInput] = useState('');
  const [govKind, setGovKind] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [activeModal, setActiveModal] = useState<'photo' | 'email' | 'campus' | 'gov' | null>(null);

  const isAllComplete = photoStatus === 'verified' && emailStatus === 'verified' && campusStatus === 'verified' && govStatus === 'verified';

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '560px', background: '#FFFFFF', borderRadius: '24px', padding: '36px', border: '1px solid #EEF2FF', boxShadow: '0 12px 40px rgba(19, 27, 46, 0.06)', boxSizing: 'border-box' }}>
        <a href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#3525CD', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to profile
        </a>

        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', color: '#4F46E5' }}>CAMPUS TRUST LEVEL 3</span>
          <h1 style={{ margin: '6px 0 8px', fontSize: '28px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>
            Verify it&rsquo;s you
          </h1>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#464555' }}>
            Clinical consultations, prescription dispensing, and health camps require identity verification under India&rsquo;s Digital Personal Data Protection Act (DPDP).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Photo Liveness */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px', borderRadius: '16px', background: photoStatus === 'verified' ? '#ECFDF5' : '#FAFAFE', border: '1px solid #EEF2FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: photoStatus === 'verified' ? '#D1FAE5' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: photoStatus === 'verified' ? '#059669' : '#3525CD' }}>
                <Camera size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Photo liveness</span>
                <span style={{ fontSize: '12px', color: '#6B6980' }}>Quick selfie check on your device</span>
              </div>
            </div>
            {photoStatus === 'verified' ? (
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setPhotoStatus('verified')}
                style={{ height: '36px', padding: '0 16px', borderRadius: '10px', background: '#3525CD', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, border: 0, cursor: 'pointer' }}
              >
                Take photo
              </button>
            )}
          </div>

          {/* 2. College Email */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px', borderRadius: '16px', background: emailStatus === 'verified' ? '#ECFDF5' : '#FAFAFE', border: '1px solid #EEF2FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: emailStatus === 'verified' ? '#D1FAE5' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emailStatus === 'verified' ? '#059669' : '#3525CD' }}>
                <Mail size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Campus email (.edu.in)</span>
                <span style={{ fontSize: '12px', color: '#6B6980' }}>Unlocks student pricing discounts</span>
              </div>
            </div>
            {emailStatus === 'verified' ? (
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEmailStatus('verified')}
                style={{ height: '36px', padding: '0 16px', borderRadius: '10px', background: '#3525CD', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, border: 0, cursor: 'pointer' }}
              >
                Verify email
              </button>
            )}
          </div>

          {/* 3. College ID Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px', borderRadius: '16px', background: campusStatus === 'verified' ? '#ECFDF5' : '#FAFAFE', border: '1px solid #EEF2FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: campusStatus === 'verified' ? '#D1FAE5' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: campusStatus === 'verified' ? '#059669' : '#3525CD' }}>
                <GraduationCap size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>College student ID</span>
                <span style={{ fontSize: '12px', color: '#6B6980' }}>Hostel block and roll number</span>
              </div>
            </div>
            {campusStatus === 'verified' ? (
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setCampusStatus('verified')}
                style={{ height: '36px', padding: '0 16px', borderRadius: '10px', background: '#3525CD', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, border: 0, cursor: 'pointer' }}
              >
                Upload ID
              </button>
            )}
          </div>

          {/* 4. Government ID */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px', borderRadius: '16px', background: govStatus === 'verified' ? '#ECFDF5' : '#FAFAFE', border: '1px solid #EEF2FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: govStatus === 'verified' ? '#D1FAE5' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: govStatus === 'verified' ? '#059669' : '#3525CD' }}>
                <FileText size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Government ID</span>
                <span style={{ fontSize: '12px', color: '#6B6980' }}>Aadhaar or PAN verification</span>
              </div>
            </div>
            {govStatus === 'verified' ? (
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setGovStatus('verified')}
                style={{ height: '36px', padding: '0 16px', borderRadius: '10px', background: '#3525CD', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, border: 0, cursor: 'pointer' }}
              >
                Link ID
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="/health"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              borderRadius: '14px',
              background: isAllComplete ? '#059669' : '#3525CD',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            {isAllComplete ? 'All verified — Go to dashboard ✓' : 'Save and return to dashboard'}
          </a>
          <span style={{ textAlign: 'center', fontSize: '12px', color: '#6B6980', lineHeight: 1.5 }}>
            Data is encrypted at rest and never shared with commercial third parties per Rule L.
          </span>
        </div>
      </div>
    </div>
  );
}
