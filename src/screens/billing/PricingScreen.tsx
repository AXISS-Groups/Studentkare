import React, { useEffect, useState } from 'react';
import { Building, ChevronDown, Crown, Gift, Globe, GraduationCap, Rocket, ShoppingBag, Sparkles, UserRound, Users } from 'lucide-react';
import { getPlans, openSubscriptionCheckout, PlanCatalog } from '../../data/billing';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
import { posthogCapture } from '../../lib/posthog';
import { DataState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { StudentKareShield } from '../../components/StudentKareLogo';
import { EmergencyBar } from '../../components/health/EmergencyBar';
import '../../theme/marketplace.css';
import '../../theme/workflows.css';

const PRICING_FAQS = [
  {
    q: 'Is Studentkare free for university students?',
    a: 'Yes. Health records, the digital health card, the emergency helpline directory and the marketplace catalogue are free. Emergency numbers work without an account at all.',
  },
  {
    q: 'What is included in the Student Plus membership?',
    a: 'Student Plus (₹99/month) is proposed, not live. What it will include is still being decided, and this page will list it once it is. A pharmacist already verifies every prescription before anything is dispensed, on every plan including the free one — that is not a paid feature.',
  },
  {
    q: 'How do campus and institutional contracts work?',
    a: 'Campus administrators can confirm student enrolment and run health camps today. Aggregate reporting does not exist yet: there is no endpoint that returns cohort data to a campus, so we do not offer a dashboard we have not built.',
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

  const load = () => getPlans().then(setCatalog).catch((reason: Error) => setError(reason.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const trackPlanSelect = (planId: string, actionFn: () => void) => {
    console.log(`[PRICING_PAGE] User selected plan: ${planId}`);
    posthogCapture('pricing_plan_selected', '/pricing', { planId });
    actionFn();
  };

  const upgrade = async (publicKey: string, subscriptionId: string, amountPaise: number) => {
    await openSubscriptionCheckout({ key: publicKey, subscriptionId, amountPaise, name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' });
    setNotice('Payment received. Your membership will activate shortly.');
    setResult({ message: 'Thank you. Your Student Plus membership is activating.' });
  };

  const handleStudentPlus = () => {
    trackPlanSelect('PREMIUM', () => {
      if (!user) { navigate('signup', 'billing'); return; }
      if (!catalog?.checkoutAvailable) { setResult({ message: 'Online payments are not configured yet. Our team will assist you.' }); return; }
      checkout.run(async () => {
        const start = await apiRequest<{ subscriptionId: string; publicKey: string; amountPaise: number }>('/billing/subscription/checkout', { method: 'POST', body: JSON.stringify({ planId: 'STUDENT_PLUS' }) });
        await upgrade(start.publicKey, start.subscriptionId, start.amountPaise);
      });
    });
  };

  const submitInquiry = () => {
    console.log(`[PRICING_PAGE] Submitting inquiry for organization: ${form.organization}`);
    posthogCapture('institutional_inquiry_submitted', '/pricing', { organization: form.organization, seats: form.seats });
    inquiryMutation.run(() => apiRequest('/billing/inquiries', { method: 'POST', body: JSON.stringify(form) }).then(() => {
      setInquiry(false); setForm({ organization: '', contactName: '', email: '', seats: 1000, message: '', consent: false });
      setResult({ message: 'Thanks. An institutional specialist will reach out shortly.' });
    }));
  };

  return <div className="wf-pricing-page wf-pricing">
    <div className="cm-pricing-wrapper">
      {/* Navigation logo */}
      <header className="cm-top-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="shop-logo-button" onClick={() => navigate('shop')} aria-label="Studentkare home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <StudentKareShield size={38} />
        </button>
      </header>

      {/* Hero title section */}
      <div className="cm-header-section">
        <h1 className="cm-header-title">Plans and pricing</h1>
        <p className="cm-header-subtitle">
          Two routes to the same product: an institution buys seats for a cohort, or a student subscribes directly.
        </p>
      </div>

      {/* Emergency bar */}
      <div style={{ marginBlock: '12px 28px' }}><EmergencyBar compact /></div>

      <DataState loading={!catalog && !error} error={error} retry={load}>
        {/* 2 Column Plan Matrix: User & Campus */}
        <div className="cm-columns-grid" aria-label="Commercial Model Plans">
          {/* Column 1: User subscription */}
          <div className="cm-column">
            <div className="cm-column-pill">User subscription</div>
            
            <div className="cm-card" onClick={() => user ? navigate('health') : navigate('signup')} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserRound size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">FREE</span>
                </div>
              </div>
              <p className="cm-card-desc"><strong>₹0</strong> — basic records, limited measurements, browse providers</p>
            </div>

            <div className="cm-card cm-card-featured" onClick={handleStudentPlus} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Crown size={17} style={{ color: '#7c3aed', flexShrink: 0 }} />
                  <span className="cm-card-title" style={{ color: '#7c3aed' }}>PREMIUM</span>
                </div>
                <span className="cm-popular-badge"><Sparkles size={11} style={{ marginRight: 4 }} /> MOST POPULAR</span>
              </div>
              <p className="cm-card-desc"><strong>₹99–199 / month</strong> — proposed pricing, not yet live</p>
            </div>

            <div className="cm-card" onClick={handleStudentPlus} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gift size={17} style={{ color: '#db2777', flexShrink: 0 }} />
                  <span className="cm-card-title">GIFT A FRIEND</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹99 one-time</strong> — gift a month of Premium to another verified student</p>
            </div>

            <div className="cm-card" onClick={() => navigate('shop')} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingBag size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">CARE MARKETPLACE</span>
                </div>
              </div>
              <p className="cm-card-desc"><strong>Pay-per-use</strong> — lab tests, medicine, teleconsult, home visits</p>
            </div>
          </div>

          {/* Column 2: Group & campus */}
          <div className="cm-column">
            <div className="cm-column-pill">Group & campus</div>

            <div className="cm-card" onClick={() => setInquiry(true)} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">FRIENDS GROUP · 25+</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹69 / member / month</strong> — minimum 25 verified students, one payer or split</p>
            </div>

            <div className="cm-card" onClick={() => setInquiry(true)} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">HOSTEL GROUP</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹59 / member / month</strong> — minimum 50 residents, warden-coordinated</p>
            </div>

            <div className="cm-card" onClick={() => setInquiry(true)} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">DEPARTMENT GROUP</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹59 / member / month</strong> — minimum 100 students, billed to the department</p>
            </div>

            <div className="cm-card" onClick={() => setInquiry(true)} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={17} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span className="cm-card-title">CAMPUS TO CAMPUS</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹0 to join</strong> — a partner campus introduces another; credit on the referred contract</p>
            </div>

            <div className="cm-card" onClick={() => setInquiry(true)} role="button" tabIndex={0}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Rocket size={17} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span className="cm-card-title">STUDENT STARTUP</span>
                </div>
                <span className="cm-proposed-badge">PROPOSED</span>
              </div>
              <p className="cm-card-desc"><strong>₹0–2,000 / month</strong> — team plan for student ventures, up to 10 members</p>
            </div>
          </div>
        </div>
      </DataState>

      {/* Governance Disclaimer Banner */}
      <div className="cm-disclaimer-box">
        Group and campus pricing is proposed, not contracted, and must be tested against delivery cost before it is quoted. Whoever pays funds access only — a hostel, department or gifting friend never sees a member's record.
      </div>

      {/*
        A "Trust & Compliance" banner stood here on this public page with four
        claims, none of which survived checking:

        - "ABDM & ABHA Compliant". There is no ABDM integration. Guardrail 6
          also rules out asserting a compliance state nothing computes.
        - "256-bit encrypted personal health records". Health records are not
          encrypted at rest. The only encryption in the repo is Fernet for
          provider integration secrets, and only when INTEGRATIONS_ENCRYPTION_KEY
          is set — otherwise even those are plaintext.
        - "NMC Doctors & Verified Labs · 100% verified clinical network". No
          registration number is stored and nothing is checked against any
          register; NMC_DOCTOR is a role an administrator sets.
        - "Instant Activation · Zero onboarding delay". Signup writes
          isVerifiedStudent: false and campus verification starts NOT_SUBMITTED.

        The disclaimer above it was written honestly. This block contradicted it
        on the same screen, so it is gone rather than reworded — there is no
        true version of a trust badge for a thing that is not verified.
      */}

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

      <footer className="wf-pricing-note">Plans shown here govern access and benefits. Clinical services are separately arranged with providers. For institutions, a signed agreement and recorded payment activate seats.</footer>
    </div>
  </div>;
}

