/**
 * Studentkare — CDSCO Recall & Spurious Batch Alert Component (M-4.5)
 * Compliance: Section M-4.5 Specification
 *
 * Displays alert when scanned batch matches a CDSCO recall or spurious-drug alert.
 * Routes student to campus clinic and pharmacy of purchase.
 */

import React from 'react';
import { ShieldAlert, PhoneCall } from 'lucide-react';

interface CDSCORecallAlertProps {
  brandName: string;
  batchNumber: string;
  manufacturer: string;
  reason: string;
  issuedDate: string;
}

export const CDSCORecallAlert: React.FC<CDSCORecallAlertProps> = ({
  brandName,
  batchNumber,
  manufacturer,
  reason,
  issuedDate,
}) => {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--sk-color-danger-bg)',
        border: '1px solid var(--sk-color-danger-rule)',
        borderRadius: '14px',
        padding: '18px',
        color: 'var(--sk-color-text)',
        margin: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <ShieldAlert size={22} color="var(--sk-color-danger)" />
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-danger)', letterSpacing: '1px' }}>CDSCO HIGH ALERT RECALL</span>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--sk-color-danger)' }}>
            Batch {batchNumber} Recalled
          </h4>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--sk-color-text)', lineHeight: 1.5, marginBottom: '12px' }}>
        <strong>{brandName}</strong> (Batch: <code style={{ color: 'var(--sk-color-danger)' }}>{batchNumber}</code>) by {manufacturer} has been recalled by CDSCO on {issuedDate}.
      </div>

      <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--sk-color-text-2)', marginBottom: '14px' }}>
        <strong>Reason:</strong> {reason}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => window.open('tel:108')}
          style={{
            padding: '8px 14px', borderRadius: '8px', background: 'var(--sk-color-danger-fill)', color: 'var(--sk-color-on-danger-fill)',
            fontWeight: 700, fontSize: '12.5px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <PhoneCall size={14} /> Contact Campus Clinic
        </button>
      </div>
    </div>
  );
};
