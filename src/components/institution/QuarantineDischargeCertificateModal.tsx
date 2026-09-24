import React, { useState } from 'react';
import { Award, CheckCircle2, FileText, Download, ShieldCheck } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

interface CertificateProps {
  studentName?: string;
  roomNo?: string;
  onClose?: () => void;
  onDischargeIssued?: (certId: string) => void;
}

export function QuarantineDischargeCertificateModal({ studentName = 'Rohan Mehta', roomNo = 'Block B — Iso Room 04', onClose, onDischargeIssued }: CertificateProps) {
  const [officerName, setOfficerName] = useState('Dr. V. Prasad (Resident Medical Officer)');
  const [afebrileHours, setAfebrileHours] = useState('48');
  const [remarks, setRemarks] = useState('Patient completely recovered from viral gastroenteritis; afebrile for 48h. Cleared for normal hostel residency & academic classes.');
  const [certId, setCertId] = useState<string | null>(null);

  const handleIssueDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (remarks.trim()) {
      const generatedCertId = `DISCH-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
      setCertId(generatedCertId);
      onDischargeIssued?.(generatedCertId);
    }
  };

  return (
    <div className="wf-card" style={{ padding: 24, maxWidth: 580, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">EPIDEMIC DISCHARGE & ACADEMIC CLEARANCE</span>
          <h2>Medical Clearance & Isolation Discharge</h2>
          <p>Issue formal medical clearance certificate reinstating student hostel status and academic class eligibility.</p>
        </div>
      </div>

      {certId ? (
        <div style={{ textAlign: 'center', padding: 24, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 12 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 20 }}>Isolation Discharge Certificate Issued!</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Certificate ID: <code>{certId}</code> · Hostel status updated to <strong>ACTIVE</strong> & academic clearance synced.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="health-button" style={{ minHeight: 40 }} onClick={() => window.print()}>
              <Download size={15} /> Print Certificate
            </button>
            <button className="health-button health-button-primary" style={{ minHeight: 40 }} onClick={onClose}>
              Done / Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleIssueDischarge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface-subtle, #f8fafc)', padding: 14, borderRadius: 10, fontSize: 13 }}>
            <div>Student: <strong>{studentName}</strong></div>
            <div>Isolation Room: <code>{roomNo}</code></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Medical Officer Name">
              <input type="text" value={officerName} onChange={e => setOfficerName(e.target.value)} required />
            </Field>

            <Field label="Afebrile Duration Verified">
              <select value={afebrileHours} onChange={e => setAfebrileHours(e.target.value)}>
                <option value="48">48 Hours Afebrile</option>
                <option value="72">72 Hours Afebrile</option>
              </select>
            </Field>
          </div>

          <Field label="Clinical Discharge Remarks & Fitness Notes">
            <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} required />
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            {onClose && (
              <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="health-button health-button-primary" style={{ minHeight: 44 }}>
              <ShieldCheck size={16} /> Issue Discharge & Academic Clearance
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
