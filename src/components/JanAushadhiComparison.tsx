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
    <div style={{ background: '#101019', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(52,211,153,0.13)', border: '1px solid #17503E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={18} color="#34D399" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', letterSpacing: '0.5px' }}>GOVERNMENT GENERIC EQUIVALENT</span>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#F4F4FA' }}>Jan Aushadhi Scheme</h4>
          </div>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#34D399', background: 'rgba(52,211,153,0.15)', padding: '4px 10px', borderRadius: '100px', border: '1px solid #17503E' }}>
          Save {savingsPercentage}%
        </span>
      </div>

      <div style={{ background: '#14141F', borderRadius: '10px', padding: '14px', border: '1px solid #262638', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{genericName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px' }}>
          <span style={{ color: '#9095A8' }}>Branded MRP: <del>₹{brandedMrp.toFixed(2)}</del></span>
          <span style={{ fontWeight: 800, color: '#34D399' }}>Jan Aushadhi Price: ₹{janMrp.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 600, marginTop: '4px', textAlign: 'right' }}>
          Saves ₹{savingsAmount} per pack
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#7E7E92' }}>
        <ShieldCheck size={14} color="#34D399" />
        <span>Public Health Information. Zero commercial commissions. Generic substitution remains a doctor's decision.</span>
      </div>
    </div>
  );
};
