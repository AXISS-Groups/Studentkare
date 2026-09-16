import React, { useEffect, useState } from 'react';
import { ArrowRight, Award, Building2, Check, ChevronDown, Lock, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { getPlans, openSubscriptionCheckout, PlanCatalog } from '../../data/billing';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
import { DataState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { EmergencyBar } from '../../components/health/EmergencyBar';
import '../../theme/marketplace.css';
import '../../theme/workflows.css';

const AUDIENCE_ICON = { student: UserRound, institution: Building2 } as const;

const PRICING_FAQS = [
  {
    q: 'Is Studentkare free for university students?',
    a: 'Yes! Core access to Studentkare health records, digital health card, emergency SOS directory, and marketplace catalog is 100% free for all verified students in India.',
  },
  {
    q: 'What is included in the Student Plus membership?',
    a: 'Student Plus (₹99/month) adds unlimited prescription reviews by licensed pharmacists, priority teleconsultation booking, automated lab trends analysis, and native Apple Health & Android Health Connect background sync.',
  },
  {
    q: 'How do campus and institutional contracts work?',
    a: 'Universities and institutes can provision seat licenses for their entire student body. Campus plans include dedicated campus admin consoles, health camp day management, and aggregate telemetry dashboards.',
  },
  {
    q: 'Can I cancel my Student Plus plan anytime?',
    a: 'Yes, you can cancel your Student Plus subscription at any time with one click from your Account Billing settings. Your benefits remain active until the end of your billing cycle.',
  },
];

export function PricingScreen() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [error, setError] = useState('');
  const [inquiry, setInquiry] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const checkout = useMutation();
  const inquiryMutation = useMutation();
  const [form, setForm] = useState({ organization: '', contactName: '', email: '', seats: 1000, message: '', consent: false });

  const load = () => getPlans().then(setCatalog).catch(reason => setError(reason.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const upgrade = async (publicKey: string, subscriptionId: string, amountPaise: number) => {
    await openSubscriptionCheckout({ key: publicKey, subscriptionId, amountPaise, name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' });
    setNotice('Payment received. Your membership will activate shortly.');
    setResult({ message: 'Thank you. Your Student Plus membership is activating.' });
  };

  const handleStudentPlus = () => {
    if (!user) { navigate('signup', 'billing'); return; }
    if (!catalog?.checkoutAvailable) { setResult({ message: 'Online payments are not configured yet. Our team will assist you.' }); return; }
    checkout.run(async () => {
      const start = await apiRequest<{ subscriptionId: string; publicKey: string; amountPaise: number }>('/billing/subscription/checkout', { method: 'POST', body: JSON.stringify({ planId: 'STUDENT_PLUS' }) });
      await upgrade(start.publicKey, start.subscriptionId, start.amountPaise);
    });
  };

  const submitInquiry = () => {
    inquiryMutation.run(() => apiRequest('/billing/inquiries', { method: 'POST', body: JSON.stringify(form) }).then(() => {
      setInquiry(false); setForm({ organization: '', contactName: '', email: '', seats: 1000, message: '', consent: false });
      setResult({ message: 'Thanks. An institutional specialist will reach out shortly.' });
    }));
  };

  return <div className="wf-pricing-page wf-pricing">
    <div className="wf-pricing-hero">
      <header className="shop-header shop-container">
        <button className="shop-logo-button" onClick={() => navigate('shop')} aria-label="Studentkare home">
          <StudentKareLogo size={34} showWordmark darkVariant={true} />
        </button>
      </header>
      <div className="shop-container wf-pricing-intro">
        <span className="care-eyebrow"><Sparkles size={14} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 6 }} />TRANSPARENT PRICING · NO HIDDEN FEES</span>
        <h1>Care that fits your student life.</h1>
        <p>100% free core platform for students. Optional Student Plus benefits when you need them. Enterprise plans for campus care coordination.</p>
      </div>
    </div>

    <main className="shop-container">
      <div className="shop-container" style={{ marginBlock: '20px 30px' }}><EmergencyBar compact /></div>
      <DataState loading={!catalog && !error} error={error} retry={load}>
        {catalog && <section className="wf-pricing-grid" aria-label="Plans">
          {catalog.plans.map(plan => {
            const Icon = AUDIENCE_ICON[plan.audience as keyof typeof AUDIENCE_ICON] || ShieldCheck;
            const primary = plan.id === 'STUDENT_PLUS';
            return <article key={plan.id} className={`wf-plan-card ${primary ? 'wf-plan-featured' : ''}`}>
              {primary && <div className="wf-plan-badge"><Sparkles size={13} />MOST POPULAR</div>}
              <div className="wf-plan-head">
                <span className={`wf-plan-icon ${primary ? 'wf-plan-icon-primary' : ''}`}><Icon size={22} /></span>
                <span className="care-eyebrow">{plan.audience.toUpperCase()}</span>
                <h2>{plan.name}</h2>
                <div className="wf-plan-price"><strong>{typeof plan.price === 'number' ? `₹${plan.price}` : plan.price}</strong><span>{plan.period}</span></div>
                <p className="wf-plan-desc">{plan.description}</p>
              </div>
              <ul className="wf-plan-benefits">{plan.benefits.map(benefit => <li key={benefit}><Check size={16} />{benefit}</li>)}</ul>
              <div className="wf-plan-action">
                {plan.id === 'FREE' && <button className="health-button" onClick={() => user ? navigate('health') : navigate('signup')}>{user ? 'Open my workspace' : 'Create free account'} <ArrowRight size={15} /></button>}
                {plan.id === 'STUDENT_PLUS' && <button className="health-button health-button-primary" disabled={checkout.busy} onClick={handleStudentPlus}>{checkout.busy ? 'Opening checkout…' : `Get Student Plus · ₹99/mo`} <ArrowRight size={15} /></button>}
                {plan.id === 'CAMPUS' && <button className="health-button" onClick={() => setInquiry(true)}>Request a campus quote <ArrowRight size={15} /></button>}
                {plan.id === 'ENTERPRISE' && <button className="health-button" onClick={() => setInquiry(true)}>Talk to enterprise sales <ArrowRight size={15} /></button>}
              </div>
            </article>;
          })}
        </section>}
      </DataState>

      {/* Trust & Compliance Banner */}
      <section className="wf-trust-banner">
        <div><Lock size={20} /><strong>ABDM & ABHA Compliant</strong><span>256-bit encrypted personal health records</span></div>
        <div><ShieldCheck size={20} /><strong>NMC Doctors & Verified Labs</strong><span>100% verified clinical network</span></div>
        <div><Award size={20} /><strong>Instant Activation</strong><span>Zero onboarding delay for students</span></div>
      </section>

      {/* FAQ Section */}
      <section className="wf-pricing-faq">
        <h2>Frequently asked questions</h2>
        <div className="wf-faq-grid">
          {PRICING_FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={faq.q} className={`wf-faq-item ${isOpen ? 'is-open' : ''}`}>
                <button type="button" className="wf-faq-question" onClick={() => setOpenFaq(isOpen ? null : index)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
                </button>
                {isOpen && <p className="wf-faq-answer">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <FormError message={checkout.error || inquiryMutation.error} />
      {notice && <div className="wf-notice" role="status">{notice}</div>}
    </main>

    {result && <ShopDialog title="Plan request" onClose={() => setResult(null)}><p>{result.message}</p><button className="shop-button shop-primary" onClick={() => setResult(null)}>Done</button></ShopDialog>}

    {inquiry && <ShopDialog title="Institutional inquiry" onClose={() => setInquiry(false)}>
      <form className="wf-form" onSubmit={event => { event.preventDefault(); submitInquiry(); }}>
        <label className="wf-field">Organization<input aria-label="Organization" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} required minLength={2} /></label>
        <label className="wf-field">Contact name<input aria-label="Contact name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></label>
        <label className="wf-field">Work email<input type="email" aria-label="Work email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
        <label className="wf-field">Students / seats<input type="number" aria-label="Students or seats" value={form.seats} min={1} onChange={e => setForm({ ...form, seats: Number(e.target.value) })} /></label>
        <label className="wf-field">What do you need?<textarea aria-label="What do you need" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} /></label>
        <label className="wf-checkbox"><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} required /> I agree to be contacted about Studentkare plans.</label>
        <button className="shop-button shop-primary" type="submit" disabled={inquiryMutation.busy}>{inquiryMutation.busy ? 'Submitting…' : 'Submit inquiry'}</button>
      </form>
    </ShopDialog>}

    <footer className="wf-pricing-note shop-container">Plans shown here govern access and benefits. Clinical services are separately arranged with providers. For institutions, a signed agreement and recorded payment activate seats.</footer>
  </div>;
}
