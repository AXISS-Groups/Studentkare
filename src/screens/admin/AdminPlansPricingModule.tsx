import React, { useState } from 'react';
import { CreditCard, Save, CheckCircle2 } from 'lucide-react';

export interface PlanConfig {
  id: string;
  name: string;
  monthlyPriceRupees: number;
  annualPriceRupees: number;
  maxCareCircleMembers: number;
  description: string;
  features: string[];
}

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'student-free',
    name: 'Student Basic (Free)',
    monthlyPriceRupees: 0,
    annualPriceRupees: 0,
    maxCareCircleMembers: 0,
    description: 'Digital health record vault, symptom checker, and offline emergency card.',
    features: ['Personal Health Vault', 'ABHA ID Link & QR', 'Offline Emergency Card', 'Agent Ayush Assistant'],
  },
  {
    id: 'student-premium',
    name: 'Student Premium',
    monthlyPriceRupees: 199,
    annualPriceRupees: 1990,
    maxCareCircleMembers: 1,
    description: 'Full care marketplace access, priority OPD bookings, and pharmacy discounts.',
    features: ['All Basic Features', 'Priority Doctor Booking', '10% Off Pharmacy Orders', 'Digital Prescriptions Vault'],
  },
  {
    id: 'care-circle',
    name: 'Care Circle Family',
    monthlyPriceRupees: 249,
    annualPriceRupees: 2490,
    maxCareCircleMembers: 5,
    description: 'Shared care circle coverage for up to 5 family members or roommates.',
    features: ['Up to 5 Members', 'Shared Emergency Alerts', 'Rule L Zero Payer Record Access', '24/7 Priority Support'],
  },
];

export const AdminPlansPricingModule: React.FC = () => {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [savedMessage, setSavedMessage] = useState<string>('');

  const handlePriceChange = (id: string, field: 'monthlyPriceRupees' | 'annualPriceRupees', value: number) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
    );
  };

  const handleSave = () => {
    localStorage.setItem('studentkare_platform_plans', JSON.stringify(plans));
    setSavedMessage('Plans & pricing updated successfully! Single source updated across Checkout & Pricing screen (Fixes SK-006).');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard style={{ color: 'var(--action)', width: '26px', height: '26px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Plans & Pricing Single Source Manager</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Single plan catalog feeding public pricing page, student billing, checkout, and contracts (Fixes SK-006).
          </p>
        </div>

        <button
          className="wf-btn-primary"
          onClick={handleSave}
          style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <Save size={16} />
          <span>Publish Plan Updates</span>
        </button>
      </div>

      {savedMessage && (
        <div style={{ background: 'var(--positive-fill)', color: '#064e3b', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {plans.map((plan) => (
          <div key={plan.id} className="wf-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{plan.name}</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '6px', color: 'var(--action)' }}>
                {plan.id}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)', height: '40px' }}>{plan.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '4px' }}>Monthly Price (₹)</label>
                <input
                  type="number"
                  value={plan.monthlyPriceRupees}
                  onChange={(e) => handlePriceChange(plan.id, 'monthlyPriceRupees', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '4px' }}>Annual Price (₹)</label>
                <input
                  type="number"
                  value={plan.annualPriceRupees}
                  onChange={(e) => handlePriceChange(plan.id, 'annualPriceRupees', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
                />
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Included Features:</span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.6' }}>
                {plan.features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
