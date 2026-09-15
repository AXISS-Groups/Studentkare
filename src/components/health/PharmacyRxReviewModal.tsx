import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, ShieldCheck, FileText, AlertCircle, RefreshCw, X, ArrowRight, Check, CornerDownRight } from 'lucide-react';
import '../../theme/workflows.css';

export interface PharmacyRxReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PharmacyRxReviewModal({ isOpen, onClose }: PharmacyRxReviewModalProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/pharmacy/rx-reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rxId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/pharmacy/rx-reviews/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rxId,
          substitutions,
        }),
      });

      if (res.ok) {
        setActionNotice(`Prescription #${rxId} approved by Pharmacist.`);
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchReviews();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div className="wf-modal-card" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <button className="wf-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#faf5ff', color: '#9333ea', padding: 8, borderRadius: 8 }}>
              <Pill size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Pharmacy Rx Review Console</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Pharmacist Fulfillment Sign-off & Generic Medicine Substitution
              </p>
            </div>
          </div>
          <button
            className="health-button"
            onClick={fetchReviews}
            disabled={loading}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Queue
          </button>
        </div>

        {actionNotice && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 10, borderRadius: 6, color: '#166534', fontSize: '0.82rem', marginBottom: 12 }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
            {actionNotice}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map(rx => (
            <div
              key={rx.rx_id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16,
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    Rx #{rx.rx_id} • Patient: {rx.patient_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Prescribed by: <strong>{rx.doctor_name}</strong> (Lic: {rx.doctor_license_no})
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {rx.signature_verified && (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      <ShieldCheck size={12} style={{ display: 'inline', marginRight: 2 }} /> Signature Verified
                    </span>
                  )}
                  <span style={{ background: rx.status === 'APPROVED_BY_PHARMACIST' ? '#e0f2fe' : '#fffbe6', color: rx.status === 'APPROVED_BY_PHARMACIST' ? '#0369a1' : '#d97706', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {rx.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {rx.medications.map((med: any) => (
                  <div key={med.item_id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {med.original_brand} ({med.active_ingredient})
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0' }}>
                      Dosage: {med.dosage} • Duration: {med.duration}
                    </div>
                    {med.suggested_generic && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.78rem', color: '#0284c7' }}>
                        <CornerDownRight size={14} />
                        <span>Generic Substitution: <strong>{med.suggested_generic}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {rx.status === 'PENDING_PHARMACIST_REVIEW' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    className="shop-button shop-primary"
                    onClick={() => handleApprove(rx.rx_id)}
                    disabled={loading}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    <Check size={14} /> Approve & Fulfill Rx Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
