import React, { useState } from 'react';
import { ShieldAlert, QrCode, PhoneCall, CheckCircle2, Lock, FileText, AlertTriangle } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

interface HandoverProps {
  onClose?: () => void;
  onHandoverComplete?: (data: { studentName: string; hospitalName: string; breakGlassAuditId: string }) => void;
}

export function EmergencyCasualtyHandoverModal({ onClose, onHandoverComplete }: HandoverProps) {
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. K. Seshadri (ER Medical Officer)');
  const [hospitalName, setHospitalName] = useState('Continental Hospitals ER, Gachibowli');
  const [breakGlassReason, setBreakGlassReason] = useState('Acute trauma admission via campus ambulance; immediate blood group & allergy access required.');
  const [isCompleted, setIsCompleted] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);

  const handleUnseal = (e: React.FormEvent) => {
    e.preventDefault();
    if (breakGlassReason.trim()) {
      const generatedAuditId = `BG-AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      setAuditId(generatedAuditId);
      setIsCompleted(true);
      onHandoverComplete?.({
        studentName: 'Aarav Sharma',
        hospitalName,
        breakGlassAuditId: generatedAuditId
      });
    }
  };

  return (
    <div className="wf-card" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow" style={{ color: 'var(--emergency, #ef4444)' }}>CASUALTY ER HANDOVER</span>
          <h2>Break-Glass ER Casualty Unseal Desk</h2>
          <p>Scan student emergency QR code to unseal vital records during ER trauma admission. Dispatches immediate guardian SMS.</p>
        </div>
      </div>

      {isCompleted ? (
        <div style={{ textAlign: 'center', padding: 24, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 12 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 20 }}>Emergency Health Vault Unsealed!</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Break-Glass Audit Hash: <code>{auditId}</code> · Guardian SMS dispatched to <strong>+91 98765 43210</strong>.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={onClose}>
              Close & View Unsealed ER Passport
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUnseal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Emergency QR Code / ABHA Token">
            <input 
              type="text" 
              value={qrCodeInput} 
              onChange={e => setQrCodeInput(e.target.value.toUpperCase())}
              placeholder="Scan or enter QR Token (e.g. PASS-9120-4491)"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Casualty ER Doctor Name">
              <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} required />
            </Field>

            <Field label="Hospital / Trauma Centre">
              <input type="text" value={hospitalName} onChange={e => setHospitalName(e.target.value)} required />
            </Field>
          </div>

          <Field label="Mandatory Break-Glass Clinical Justification">
            <textarea rows={3} value={breakGlassReason} onChange={e => setBreakGlassReason(e.target.value)} required />
          </Field>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            {onClose && (
              <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="health-button"
              style={{ background: '#ef4444', color: '#fff', border: 'none', minHeight: 44, fontWeight: 700 }}
              disabled={!breakGlassReason.trim()}
            >
              <ShieldAlert size={16} /> Unseal Health Vault & Notify Guardian
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
