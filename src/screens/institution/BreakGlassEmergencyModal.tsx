import React, { useState } from 'react';
import { AlertOctagon, Eye } from 'lucide-react';

interface BreakGlassEmergencyModalProps {
  onClose?: () => void;
}

export const BreakGlassEmergencyModal: React.FC<BreakGlassEmergencyModalProps> = ({ onClose }) => {
  const [studentName, setStudentName] = useState<string>('Aarav Mehta (2024-CS-102)');
  const [reason, setReason] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const handleBreakGlass = () => {
    if (!reason.trim()) return;
    setIsUnlocked(true);
    // Audit log simulation
    console.log('[BREAK-GLASS AUDIT]', { student: studentName, reason, timestamp: new Date().toISOString() });
  };

  return (
    <div className="wf-card" style={{ maxWidth: '600px', margin: '20px auto', padding: '24px', border: '2px solid var(--emergency)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--rule)', paddingBottom: '12px' }}>
        <AlertOctagon style={{ color: 'var(--emergency)', width: '28px', height: '28px' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--emergency)' }}>Break-Glass Emergency Health Card View</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Strict medical emergency access. Mandatory audit logging & student notification.</span>
        </div>
      </div>

      {!isUnlocked ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(179, 36, 26, 0.08)', padding: '14px', borderRadius: '8px', fontSize: '13px', color: 'var(--emergency)', lineHeight: '1.5' }}>
            <strong>WARNING:</strong> Break-Glass bypasses normal DPDP consent for life-threatening emergencies. Every access requires a mandatory justification, immediately alerts the student via WhatsApp/Email, and records an immutable log entry in the SuperAdmin audit chain.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Student Target</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Mandatory Emergency Reason <span style={{ color: 'var(--emergency)' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unconscious student in Block A hostel. Immediate blood group and severe allergy check required for ambulance triage."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {onClose && (
              <button className="wf-btn-secondary" onClick={onClose} style={{ flex: 1, padding: '10px' }}>
                Cancel
              </button>
            )}
            <button
              className="wf-btn-primary"
              disabled={!reason.trim()}
              onClick={handleBreakGlass}
              style={{ flex: 1, padding: '10px', background: 'var(--emergency)', borderColor: 'var(--emergency)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Eye size={16} />
              <span>Confirm Break-Glass Access</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-2)' }}>
            <strong>AUDITED READOUT:</strong> {studentName} • Emergency Card Fields Only
          </div>

          {/* Minimal Emergency Card Fields */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><strong>Blood Group:</strong> <span style={{ color: 'var(--emergency)', fontWeight: 700 }}>O Positive (O+)</span></div>
            <div><strong>Known Allergies:</strong> Penicillin, Sulfa drugs</div>
            <div><strong>Chronic Conditions:</strong> Asthma (Inhaler carried)</div>
            <div><strong>Emergency Contacts:</strong> Father: +91 98765 00001 • Mother: +91 98765 00002</div>
          </div>

          <button
            className="wf-btn-secondary"
            onClick={onClose}
            style={{ marginTop: '16px', width: '100%', padding: '10px' }}
          >
            Close Emergency View
          </button>
        </div>
      )}
    </div>
  );
};
