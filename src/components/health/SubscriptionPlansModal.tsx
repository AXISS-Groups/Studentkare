import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Check, ShieldCheck, X, Stethoscope, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../../data/subscriptionPlans';
import { useStudentStore } from '../../store/AppStores';

export interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: SubscriptionPlanId) => void;
}

function SubscriptionPlansModalUnwrapped({ isOpen, onClose, onSelectPlan }: SubscriptionPlansModalProps) {
  const { student, updateStudent } = useStudentStore();
  const currentPlanId = student.subscriptionPlanId || 'FREE';
  const [selectedId, setSelectedId] = useState<SubscriptionPlanId>(currentPlanId);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleChoosePlan = (planId: SubscriptionPlanId) => {
    setSelectedId(planId);
    updateStudent({ subscriptionPlanId: planId });
    if (onSelectPlan) onSelectPlan(planId);
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    setSuccessMsg(`🎉 Successfully activated ${plan?.name}! Your health coverage has been updated.`);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 10, 30, 0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 12, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 16 }}>
              <ShieldCheck size={28} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>StudentKare Health Membership & Protection Plans</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#e9d5ff' }}>Select a health coverage plan tailored for your campus stay</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          {successMsg && (
            <div style={{ marginBottom: 20, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 14, borderRadius: 14, color: '#047857', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check size={20} /> {successMsg}
            </div>
          )}

          {/* 4 Subscription Plans Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const isSelected = selectedId === plan.id;
              return (
                <div
                  key={plan.id}
                  style={{
                    background: isSelected ? '#f5f3ff' : '#ffffff',
                    border: `2px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                    borderRadius: 20,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isSelected ? '0 10px 30px rgba(124, 60, 237, 0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {plan.badge && (
                    <span style={{ position: 'absolute', top: -12, right: 16, background: plan.badgeColor || '#7c3aed', color: '#ffffff', fontSize: '0.65rem', fontWeight: 900, padding: '3px 10px', borderRadius: 9999 }}>
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b' }}>{plan.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4c1d95' }}>₹{plan.price}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 700 }}>/{plan.period}</span>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>{plan.description}</p>

                    {/* Checkups */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 12, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 6 }}>INCLUDED FREE CHECKUPS:</span>
                      {plan.freeCheckups.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                          {c}
                        </div>
                      ))}
                    </div>

                    {/* Doctor & X-Ray Perks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem', marginBottom: 14 }}>
                      <div style={{ color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Stethoscope size={13} /> {plan.doctorConsultations}
                      </div>
                      <div style={{ color: '#9d174d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={13} /> X-Ray: {plan.xrayDiscount}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChoosePlan(plan.id)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 12,
                      background: isCurrent ? '#059669' : isSelected ? '#7c3aed' : '#f1f5f9',
                      color: isCurrent || isSelected ? '#ffffff' : '#334155',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {isCurrent ? <><Check size={14} /> Active Plan</> : isSelected ? 'Confirm Plan' : plan.price === 0 ? 'Select Free Plan' : `Activate ₹${plan.price}/mo`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Plan Comparison Summary Table */}
          <div style={{ marginTop: 28, background: '#f8fafc', borderRadius: 18, padding: 20, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
              📊 Detailed Feature & Services Comparison Matrix
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '8px 12px' }}>Service / Benefit</th>
                    <th style={{ padding: '8px 12px' }}>Free Plan (₹0)</th>
                    <th style={{ padding: '8px 12px' }}>Plan A (₹59)</th>
                    <th style={{ padding: '8px 12px' }}>Plan B (₹159)</th>
                    <th style={{ padding: '8px 12px' }}>Full Plan (₹299)</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#334155' }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Blood Checkup</td>
                    <td style={{ padding: '8px 12px' }}>✅ Basic (Hb, Sugar)</td>
                    <td style={{ padding: '8px 12px' }}>✅ Full CBC</td>
                    <td style={{ padding: '8px 12px' }}>✅ Blood + Lipid</td>
                    <td style={{ padding: '8px 12px' }}>✅ Full 50+ Markers</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Heart & BP Checkup</td>
                    <td style={{ padding: '8px 12px' }}>✅ Basic BP</td>
                    <td style={{ padding: '8px 12px' }}>✅ Vitals + Pulse</td>
                    <td style={{ padding: '8px 12px' }}>✅ 12-Lead Cardiac ECG</td>
                    <td style={{ padding: '8px 12px' }}>✅ Cardiac ECG + Spirometry</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Vision & Acuity</td>
                    <td style={{ padding: '8px 12px' }}>✅ Snellen Chart</td>
                    <td style={{ padding: '8px 12px' }}>✅ Snellen + Ishihara</td>
                    <td style={{ padding: '8px 12px' }}>✅ Vision + ENT Check</td>
                    <td style={{ padding: '8px 12px' }}>✅ Vision, ENT & Dental</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Doctor Teleconsultation</td>
                    <td style={{ padding: '8px 12px' }}>Pay-per-visit</td>
                    <td style={{ padding: '8px 12px' }}>1 Free / mo</td>
                    <td style={{ padding: '8px 12px' }}>3 Free / mo</td>
                    <td style={{ padding: '8px 12px' }}>🌟 Unlimited Free</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>X-Ray & Scans Discount</td>
                    <td style={{ padding: '8px 12px' }}>0%</td>
                    <td style={{ padding: '8px 12px' }}>15% Off</td>
                    <td style={{ padding: '8px 12px' }}>35% Off</td>
                    <td style={{ padding: '8px 12px' }}>🌟 60% Off</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SubscriptionPlansModal = observer(SubscriptionPlansModalUnwrapped);
