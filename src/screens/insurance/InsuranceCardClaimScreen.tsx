import React, { useState } from 'react';
import { FileText, CheckCircle2, Download, Search } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function InsuranceCardClaimScreen() {
  const [claimModal, setClaimModal] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  const policyDetails = {
    provider: 'ICICI Lombard GIC Ltd.',
    policyNo: 'POL-GHI-2026-IIT-99182',
    sumInsured: '₹ 2,00,000 / Academic Year',
    opdSublimit: '₹ 15,000 OPD / Dental',
    tpaName: 'Medi Assist Insurance TPA Pvt. Ltd.',
    tpaHelpline: '1800-425-9449',
    cashlessStatus: 'ACTIVE',
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hospitalName && claimAmount) {
      setClaimSuccess(true);
      setTimeout(() => {
        setClaimSuccess(false);
        setClaimModal(false);
      }, 1500);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">CAMPUS GROUP HEALTH INSURANCE</span>
          <h2>Insurance Card & TPA Claim Desk</h2>
          <p>Access your digital health insurance card, search cashless network hospitals, and file reimbursement claims.</p>
        </div>

        <button 
          className="health-button health-button-primary"
          style={{ minHeight: 44 }}
          onClick={() => setClaimModal(true)}
        >
          <FileText size={16} /> File TPA Claim Request
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 24 }}>
        {/* Digital Card Preview */}
        <div className="wf-card" style={{
          padding: 24,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: '#fff',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>STUDENT GROUP HEALTH POLICY</span>
              <h3 style={{ fontSize: 20, marginTop: 4, color: '#fff' }}>{policyDetails.provider}</h3>
              <p style={{ fontSize: 13, color: '#bfdbfe', margin: '2px 0' }}>Policy No: {policyDetails.policyNo}</p>
            </div>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
              ● CASHLESS ACTIVE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'rgba(255,255,255,0.06)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: '#93c5fd', display: 'block' }}>SUM INSURED (IPD)</span>
              <strong style={{ fontSize: 16, color: '#fff' }}>{policyDetails.sumInsured}</strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#93c5fd', display: 'block' }}>OPD / CLINIC COVER</span>
              <strong style={{ fontSize: 16, color: '#60a5fa' }}>{policyDetails.opdSublimit}</strong>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>TPA: <strong>{policyDetails.tpaName}</strong></span>
            <span>TPA Toll-Free: <strong>{policyDetails.tpaHelpline}</strong></span>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="care-eyebrow">QUICK ACTIONS</span>
          <button className="health-button" style={{ minHeight: 44, width: '100%' }}>
            <Download size={16} /> Download Policy Schedule PDF
          </button>
          <button className="health-button" style={{ minHeight: 44, width: '100%' }}>
            <Search size={16} /> Find Cashless Network Hospitals
          </button>
        </div>
      </div>

      {/* Claim Modal */}
      {claimModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="wf-card" style={{ width: '100%', maxWidth: 480, padding: 24, background: 'var(--surface-card, #fff)' }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>File TPA Claim Reimbursement</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Submit hospital bills, discharge summaries, and prescriptions for TPA processing.
            </p>

            {claimSuccess ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#10b981' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 8px' }} />
                <strong>Claim Request Submitted!</strong>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Claim Reference ID: <code>TPA-CLM-2026-9812</code></p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Hospital / Clinic Name">
                  <input type="text" value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="e.g. Continental Hospitals, Gachibowli" required />
                </Field>
                <Field label="Claim Amount (₹)">
                  <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} placeholder="e.g. 12500" required />
                </Field>

                <Field label="Upload Bills & Discharge Summary">
                  <input type="file" disabled style={{ fontSize: 12 }} />
                </Field>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => setClaimModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="health-button health-button-primary" style={{ minHeight: 44 }}>
                    Submit Claim to TPA
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
