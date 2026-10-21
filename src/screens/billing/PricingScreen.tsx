import React, { useEffect, useState } from 'react';
import { Building, ChevronDown, Crown, Gift, Globe, GraduationCap, Rocket, ShoppingBag, UserRound, Users } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { pressable } from '@/lib/a11y/pressable';
import { getPlans, openSubscriptionCheckout, PlanCatalog } from '../../data/datasets/billing';
import { planPackageLabels, planPriceLabel } from '../../data/datasets/billingPrices';
import { useAuth } from '../../data/contexts/AuthContext';
import { apiRequest } from '../../data/services/http';
import { navigate } from '../../lib/utils/workflowRouting';
import { posthogCapture } from '../../lib/analytics/posthog';
import { DataState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { StudentKareShield } from '../../components/StudentKareLogo';
import { EmergencyBar } from '../../components/health/EmergencyBar';
import '../../theme/marketplace.css';
import '../../theme/workflows.css';

/**
 * FAQ copy lives in the shopweb catalogue. The Student Plus answer used to say
 * "a pharmacist already verifies every prescription before anything is
 * dispensed" — nothing in the system does that (see ShopFront), so it is gone.
 */
const PRICING_FAQS = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

type CardTone = 'action' | 'info' | 'attention';
const TONE: Record<CardTone, string> = { action: 'var(--sk-color-action)', info: 'var(--sk-color-info)', attention: 'var(--sk-color-attention)' };

/**
 * Group and campus tiers are a commercial proposal (labelled PROPOSED on the
 * card and in the disclaimer). Their figures are the proposal's, not a
 * server price list; nothing here sells them.
 */
const GROUP_PLANS = [
  { id: 'friends', Icon: Users, tone: 'action' },
  { id: 'hostel', Icon: Building, tone: 'action' },
  { id: 'department', Icon: GraduationCap, tone: 'action' },
  { id: 'campus', Icon: Globe, tone: 'action' },
  { id: 'startup', Icon: Rocket, tone: 'attention' },
] as const satisfies readonly { id: string; Icon: React.ElementType; tone: CardTone }[];

type PlanCopyId = 'free' | 'gift' | 'market' | typeof GROUP_PLANS[number]['id'];
const planKey = (id: PlanCopyId, part: 'title' | 'price' | 'desc'): MessageKey => `shopweb.pricing.${id}.${part}`;

function PlanCard({ title, price, desc, Icon, tone, proposed, onActivate }: {
  title: string; price: string; desc: string; Icon: React.ElementType; tone: CardTone; proposed?: string; onActivate: () => void;
}) {
  return <div className="cm-card" {...pressable(onActivate)}>
    <div className="cm-card-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={17} aria-hidden="true" style={{ color: TONE[tone], flexShrink: 0 }} />
        <span className="cm-card-title">{title}</span>
      </div>
      {proposed && <span className="cm-proposed-badge">{proposed}</span>}
    </div>
    <p className="cm-card-desc"><strong>{price}</strong> — {desc}</p>
  </div>;
}

export function PricingScreen() {
  const t = useT();
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
    setNotice(t('shopweb.pricing.paymentReceived'));
    setResult({ message: t('shopweb.pricing.activating') });
  };

  const handleStudentPlus = () => {
    trackPlanSelect('PREMIUM', () => {
      if (!user) { navigate('signup', 'billing'); return; }
      if (!catalog?.checkoutAvailable) { setResult({ message: t('shopweb.pricing.notConfigured') }); return; }
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
      setResult({ message: t('shopweb.pricing.inquirySent') });
    }));
  };

  // Plan prices are the server's plan list (settings registry), never a figure typed into this page.
  const plusPlan = catalog?.plans.find(plan => plan.id === 'STUDENT_PLUS');
  const plusPrice = plusPlan && typeof plusPlan.price === 'number' ? t('shopweb.plans.amountPerMonth', { price: planPriceLabel(plusPlan, t) }) : t('shopweb.pricing.premium.priceUnavailable');
  const plusPackages = plusPlan ? planPackageLabels(plusPlan, t) : [];
  const plusPackageMonths = plusPlan?.packages?.[0]?.months;
  const premiumPlan = catalog?.plans.find(plan => plan.id === 'PREMIUM');
  const premiumPrice = premiumPlan && typeof premiumPlan.price === 'number' ? t('shopweb.plans.amountPerMonth', { price: planPriceLabel(premiumPlan, t) }) : t('shopweb.pricing.premium.priceUnavailable');

  return <div className="wf-pricing-page wf-pricing">
    <div className="cm-pricing-wrapper">
      {/* Navigation logo */}
      <header className="cm-top-bar" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="shop-logo-button" onClick={() => navigate('shop')} aria-label={t('shopweb.homeLabel')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 44, minHeight: 44 }}>
          <StudentKareShield size={38} alt="" />
        </button>
      </header>

      {/* Hero title section */}
      <div className="cm-header-section">
        <h1 className="cm-header-title">{t('shopweb.pricing.title')}</h1>
        <p className="cm-header-subtitle">{t('shopweb.pricing.subtitle')}</p>
      </div>

      {/* Emergency bar */}
      <div style={{ marginBlock: '12px 28px' }}><EmergencyBar compact /></div>

      <DataState loading={!catalog && !error} error={error} retry={load}>
        {/* 2 Column Plan Matrix: User & Campus */}
        <div className="cm-columns-grid" role="group" aria-label={t('shopweb.pricing.plansLabel')}>
          {/* Column 1: User subscription */}
          <div className="cm-column">
            <div className="cm-column-pill">{t('shopweb.pricing.userColumn')}</div>

            <PlanCard title={t(planKey('free', 'title'))} price={t(planKey('free', 'price'))} desc={t(planKey('free', 'desc'))} Icon={UserRound} tone="action" onActivate={() => user ? navigate('health') : navigate('signup')} />

            {/* No "MOST POPULAR" badge: nothing measures popularity, and this plan's own card said it was not live. */}
            <div className="cm-card cm-card-featured" {...pressable(handleStudentPlus)}>
              <div className="cm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Crown size={17} aria-hidden="true" style={{ color: TONE.info, flexShrink: 0 }} />
                  <span className="cm-card-title" style={{ color: TONE.info }}>{t('shopweb.pricing.premium.title')}</span>
                </div>
              </div>
              <p className="cm-card-desc"><strong>{plusPrice}</strong> — {catalog?.checkoutAvailable ? t('shopweb.pricing.premium.live') : t('shopweb.pricing.premium.notLive')}</p>
              {plusPackages.map(label => <p key={label} className="cm-card-desc"><strong>{label}</strong></p>)}
              {plusPackageMonths !== undefined && <p className="cm-card-desc">{t('shopweb.plans.packageOffline', { months: plusPackageMonths })}</p>}
            </div>

            {/* Premium has a starting price only; it is not sold online, so its card explains rather than checks out. */}
            {premiumPlan && <PlanCard title={t('shopweb.pricing.premiumTier.title')} price={premiumPrice} desc={t('shopweb.pricing.premiumTier.desc')} Icon={Crown} tone="attention" onActivate={() => setResult({ message: t('shopweb.pricing.premiumTier.notAvailable') })} />}

            {/* Gifting is proposed. It used to start the viewer's own Student Plus checkout. */}
            <PlanCard title={t(planKey('gift', 'title'))} price={t(planKey('gift', 'price'))} desc={t(planKey('gift', 'desc'))} Icon={Gift} tone="attention" proposed={t('shopweb.pricing.proposed')} onActivate={() => setResult({ message: t('shopweb.pricing.gift.notAvailable') })} />

            <PlanCard title={t(planKey('market', 'title'))} price={t(planKey('market', 'price'))} desc={t(planKey('market', 'desc'))} Icon={ShoppingBag} tone="action" onActivate={() => navigate('shop')} />
          </div>

          {/* Column 2: Group & campus */}
          <div className="cm-column">
            <div className="cm-column-pill">{t('shopweb.pricing.groupColumn')}</div>
            {GROUP_PLANS.map(plan => <PlanCard key={plan.id} title={t(planKey(plan.id, 'title'))} price={t(planKey(plan.id, 'price'))} desc={t(planKey(plan.id, 'desc'))} Icon={plan.Icon} tone={plan.tone} proposed={t('shopweb.pricing.proposed')} onActivate={() => setInquiry(true)} />)}
          </div>
        </div>
      </DataState>

      {/* Governance Disclaimer Banner */}
      <div className="cm-disclaimer-box">
        {t('shopweb.pricing.disclaimer')}
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
        <h2>{t('shopweb.pricing.faqTitle')}</h2>
        <div className="wf-faq-grid">
          {PRICING_FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={faq} className={`wf-faq-item ${isOpen ? 'is-open' : ''}`}>
                <button type="button" className="wf-faq-question" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}>
                  <span>{t(`shopweb.pricing.${faq}.q`)}</span>
                  <ChevronDown size={18} aria-hidden="true" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
                </button>
                {isOpen && <p className="wf-faq-answer">{t(`shopweb.pricing.${faq}.a`)}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <FormError message={checkout.error || inquiryMutation.error} />
      {notice && <div className="wf-notice" role="status">{notice}</div>}

      {result && <ShopDialog title={t('shopweb.pricing.planRequest')} onClose={() => setResult(null)}><p>{result.message}</p><button type="button" className="shop-button shop-primary" onClick={() => setResult(null)}>{t('common.done')}</button></ShopDialog>}

      {inquiry && <ShopDialog title={t('shopweb.pricing.inquiryTitle')} onClose={() => setInquiry(false)}>
        <form className="wf-form" onSubmit={event => { event.preventDefault(); submitInquiry(); }}>
          <label className="wf-field">{t('shopweb.pricing.organization')}<input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} required minLength={2} /></label>
          <label className="wf-field">{t('shopweb.pricing.contactName')}<input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></label>
          <label className="wf-field">{t('shopweb.pricing.email')}<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label className="wf-field">{t('shopweb.pricing.seats')}<input type="number" value={form.seats} min={1} onChange={e => setForm({ ...form, seats: Number(e.target.value) })} /></label>
          <label className="wf-field">{t('shopweb.pricing.need')}<textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} /></label>
          <label className="wf-checkbox"><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} required /> {t('shopweb.pricing.consent')}</label>
          <button className="shop-button shop-primary" type="submit" disabled={inquiryMutation.busy}>{inquiryMutation.busy ? t('shopweb.pricing.submitting') : t('shopweb.pricing.submit')}</button>
        </form>
      </ShopDialog>}

      <footer className="wf-pricing-note">{t('shopweb.pricing.footer')}</footer>
    </div>
  </div>;
}

