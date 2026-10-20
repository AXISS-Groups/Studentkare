/**
 * Studentkare — Jan Aushadhi Generic Comparison Component (M-4.4)
 * Compliance: Section M-4.4 Specification
 *
 * Displays Pradhan Mantri Bhartiya Janaushadhi Pariyanjana (PMBJP) generic equivalent,
 * government MRP, and savings calculation.
 *
 * Strict Rule: Jan Aushadhi is a government public health scheme with no commission.
 * Commercial generic substitution ads or affiliate links are STRICTLY PROHIBITED (Rules L1-L8).
 */

import React from 'react';
import { Pill, ShieldCheck } from 'lucide-react';

interface JanAushadhiComparisonProps {
  genericName: string;
  brandedMrp: number;
  janMrp: number;
  savingsPercentage: number;
}

export const JanAushadhiComparison: React.FC<JanAushadhiComparisonProps> = ({
  genericName,
  brandedMrp,
  janMrp,
  savingsPercentage,
}) => {
  const savingsAmount = (brandedMrp - janMrp).toFixed(2);

  return (
    <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: '14px', padding: '18px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--sk-color-positive-bg)', border: '1px solid var(--sk-color-positive-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={18} color="var(--sk-color-positive)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sk-color-positive)', letterSpacing: '0.5px' }}>GOVERNMENT GENERIC EQUIVALENT</span>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--sk-color-text)' }}>Jan Aushadhi Scheme</h4>
          </div>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sk-color-positive)', background: 'var(--sk-color-positive-bg)', padding: '4px 10px', borderRadius: '100px', border: '1px solid var(--sk-color-positive-rule)' }}>
          Save {savingsPercentage}%
        </span>
      </div>

      <div style={{ background: 'var(--sk-color-surface-2)', borderRadius: '10px', padding: '14px', border: '1px solid var(--sk-color-rule)', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{genericName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px' }}>
          <span style={{ color: 'var(--sk-color-text-2)' }}>Branded MRP: <del>₹{brandedMrp.toFixed(2)}</del></span>
          <span style={{ fontWeight: 800, color: 'var(--sk-color-positive)' }}>Jan Aushadhi Price: ₹{janMrp.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sk-color-positive)', fontWeight: 600, marginTop: '4px', textAlign: 'right' }}>
          Saves ₹{savingsAmount} per pack
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--sk-color-text-3)' }}>
        <ShieldCheck size={14} color="var(--sk-color-positive)" />
        <span>Public Health Information. Zero commercial commissions. Generic substitution remains a doctor's decision.</span>
      </div>
    </div>
  );
};
