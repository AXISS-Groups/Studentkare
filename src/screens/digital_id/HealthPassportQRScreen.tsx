import React, { useState } from 'react';
import { QrCode, ShieldCheck, Heart, AlertTriangle, Phone, Copy, Check, Download, Share2 } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import '../../theme/workflows.css';

export function HealthPassportQRScreen() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const passportData = {
    name: user?.fullName || 'Aarav Sharma',
    rollNo: '2024-CS-1092',
    campus: 'IIT Hyderabad (Kandi Campus)',
    abhaId: '91-2384-9120-4491',
    bloodGroup: 'O+ Positive',
    allergies: ['Penicillin (Mild)', 'Peanuts'],
    emergencyContacts: [
      { name: 'Dr. R. Sharma (Father)', phone: '+91 98765 43210', relation: 'Parent' },
      { name: 'Hostel Block B Warden Desk', phone: '+91 91234 56789', relation: 'Campus Warden' }
    ],
    organDonor: true,
    abdmVerified: true,
  };

  const copyPassportLink = () => {
    navigator.clipboard.writeText(`https://studentkare.co/pass/${passportData.abhaId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DIGITAL HEALTH IDENTIFIER</span>
          <h2>Campus Health Passport & Emergency QR</h2>
          <p>Scannable offline emergency pass containing critical allergies, blood group, and verified ABDM credentials.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Main Digital Card */}
        <div className="wf-card" style={{
          padding: 24,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>STUDENTKARE HEALTH PASSPORT</span>
              <h3 style={{ fontSize: 22, marginTop: 4, color: '#fff' }}>{passportData.name}</h3>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: '2px 0' }}>Roll No: {passportData.rollNo} · {passportData.campus}</p>
            </div>
            {passportData.abdmVerified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)',
                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999
              }}>
                <ShieldCheck size={14} /> ABDM VERIFIED
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>BLOOD GROUP</span>
              <strong style={{ fontSize: 18, color: '#f87171' }}>{passportData.bloodGroup}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>ABHA NUMBER</span>
              <strong style={{ fontSize: 14, color: '#e2e8f0' }}>{passportData.abhaId}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>KNOWN ALLERGIES</span>
              <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>{passportData.allergies.join(', ')}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>ORGAN DONOR</span>
              <span style={{ fontSize: 13, color: '#86efac', fontWeight: 600 }}>{passportData.organDonor ? 'YES (Pledged)' : 'NO'}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 8 }}>EMERGENCY CONTACTS</span>
            {passportData.emergencyContacts.map((contact, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span>{contact.name} <small style={{ color: '#94a3b8' }}>({contact.relation})</small></span>
                <strong style={{ color: '#60a5fa' }}>{contact.phone}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code & Share Box */}
        <div className="wf-card" style={{ padding: 24, textAlign: 'center' }}>
          <span className="care-eyebrow">FIRST RESPONDER SCAN</span>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)', margin: '12px 0 16px', display: 'inline-block' }}>
            {/* Embedded SVG QR placeholder representation */}
            <QrCode size={160} color="#0f172a" style={{ margin: '0 auto' }} />
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Scan with any phone camera during medical emergencies to view verified blood group & allergies.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              className="health-button health-button-primary"
              style={{ minHeight: 44, width: '100%' }}
              onClick={copyPassportLink}
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? 'Passport Link Copied!' : 'Share Health Passport'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
