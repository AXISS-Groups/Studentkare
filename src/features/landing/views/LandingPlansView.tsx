import React, { useCallback, useEffect, useState } from 'react';
import { pressable } from '@/lib/a11y/pressable';
import { getPlans } from '@/data/datasets/billing';
import { planPackageLabels, planPriceLabel } from '@/data/datasets/billingPrices';
import type { BillingPackage, BillingPlan } from '@/data/datasets/billing';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

/**
 * Public plans page.
 *
 * Plan names, prices and benefits come only from the server catalogue
 * (`GET /billing/plans`) — the same source the checkout uses. This page used
 * to hard-code "Premium ₹199" and "Care Circle ₹249" with features (unlimited
 * tracking, dose reminders, 5-member plans) that no plan on the server
 * offers. If the catalogue cannot be read, no price is shown at all.
 */
type PlansState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; plans: BillingPlan[] };

const PAGE_X = 'clamp(16px, 3.5vw, 44px)';

function isPackage(value: unknown): value is BillingPackage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.months === 'number' && typeof v.price === 'number';
}

function footKey(plan: BillingPlan): MessageKey | null {
  if (plan.audience === 'institution') return 'landing.plans.foot.institution';
  if (plan.id === 'FREE') return 'landing.plans.foot.free';
  if (plan.id === 'STUDENT_PLUS') return 'landing.plans.foot.paid';
  return null;
}

function isPlan(value: unknown): value is BillingPlan {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.period === 'string' &&
    typeof v.description === 'string' && typeof v.audience === 'string' &&
    (typeof v.price === 'number' || typeof v.price === 'string') &&
    Array.isArray(v.benefits) && v.benefits.every((b) => typeof b === 'string') &&
    (v.priceFrom === undefined || typeof v.priceFrom === 'boolean') &&
    (v.packages === undefined || (Array.isArray(v.packages) && v.packages.every(isPackage)));
}

/** Fail closed: one malformed plan and no price is shown at all. */
function parsePlans(value: unknown): BillingPlan[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const plans = (value as Record<string, unknown>).plans;
  return Array.isArray(plans) && plans.every(isPlan) ? plans : null;
}

function usePlanCatalog(): { state: PlansState; reload: () => void } {
  const [state, setState] = useState<PlansState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    getPlans()
      .then((catalog: unknown) => {
        if (!live) return;
        const plans = parsePlans(catalog);
        setState(plans ? { status: 'ready', plans } : { status: 'error' });
      })
      .catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}

export function LandingPlansView(): React.ReactElement {
  const t = useT();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { state, reload } = usePlanCatalog();

  const nav: { label: MessageKey; href: string; on: boolean }[] = [
    { label: 'landing.plans.nav.discover', href: '/landing', on: false },
    { label: 'landing.plans.nav.wellness', href: '/shop', on: false },
    { label: 'landing.plans.nav.training', href: '/wellness', on: false },
    { label: 'landing.plans.nav.labTests', href: '/lab-tests', on: false },
    { label: 'landing.plans.nav.findDoctor', href: '/consult', on: false },
    { label: 'landing.plans.nav.programmes', href: '/programs', on: false },
    { label: 'landing.plans.nav.plans', href: '/plans', on: true }
  ];

  const payPerUse: { label: MessageKey; note: MessageKey }[] = [
    { label: 'landing.plans.ppu.labLabel', note: 'landing.plans.ppu.labNote' },
    { label: 'landing.plans.ppu.medicinesLabel', note: 'landing.plans.ppu.medicinesNote' },
    { label: 'landing.plans.ppu.teleconsultLabel', note: 'landing.plans.ppu.teleconsultNote' },
    { label: 'landing.plans.ppu.visitLabel', note: 'landing.plans.ppu.visitNote' }
  ];

  const neverRules: { label: MessageKey; on: boolean }[] = [
    { label: 'landing.plans.never.critical', on: false },
    { label: 'landing.plans.never.crisis', on: false },
    { label: 'landing.plans.never.access', on: false },
    { label: 'landing.plans.never.export', on: false },
    { label: 'landing.plans.never.benefits', on: true }
  ];

  const faqs: { q: MessageKey; a: MessageKey }[] = [
    { q: 'landing.plans.faq.q1', a: 'landing.plans.faq.a1' },
    { q: 'landing.plans.faq.q2', a: 'landing.plans.faq.a2' },
    { q: 'landing.plans.faq.q3', a: 'landing.plans.faq.a3' },
    { q: 'landing.plans.faq.q4', a: 'landing.plans.faq.a4' }
  ];

  const pillars: { title: MessageKey; body: MessageKey }[] = [
    { title: 'landing.plans.pillars.privateTitle', body: 'landing.plans.pillars.privateBody' },
    { title: 'landing.plans.pillars.listedTitle', body: 'landing.plans.pillars.listedBody' },
    { title: 'landing.plans.pillars.nearTitle', body: 'landing.plans.pillars.nearBody' },
    { title: 'landing.plans.pillars.priceTitle', body: 'landing.plans.pillars.priceBody' }
  ];

  const footerLink: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '14px', color: 'var(--sk-color-sidebar-ink-2)', textDecoration: 'none' };

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* 1. Header */}
      <header style={{ minHeight: '66px', padding: `0 ${PAGE_X}`, background: 'var(--sk-color-surface)', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--sk-color-rule-soft)', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" aria-label={t('landing.plans.homeLink')} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label={t('landing.plans.navLabel')}>
          {nav.map((n) => (
            <a
              key={n.label}
              href={n.href}
              aria-current={n.on ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '44px',
                padding: '0 14px',
                borderRadius: '11px',
                fontSize: '13.5px',
                textDecoration: 'none',
                ...(n.on ? { background: 'var(--sk-color-surface-3)', color: 'var(--sk-color-action)', fontWeight: 800 } : { color: 'var(--sk-color-text-2)', fontWeight: 600 })
              }}
            >
              {t(n.label)}
            </a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '13.5px', fontWeight: 600, color: 'var(--sk-color-text-2)', textDecoration: 'none' }}>
          {t('landing.plans.signIn')}
        </a>
      </header>

      {/* 2. Top Banner with Background Video */}
      <section
        aria-label={t('landing.plans.nav.plans')}
        style={{
          flexShrink: 0,
          position: 'relative',
          margin: `22px ${PAGE_X} 0`,
          height: '240px',
          borderRadius: '28px',
          background: 'var(--sk-color-brand-navy)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <video
          src="/assets/fabac8217d14af9d87dd5d5244554ee7.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--sk-color-brand-navy) 0%, var(--sk-color-brand-navy) 30%, rgba(6,5,26,0.55) 52%, rgba(6,5,26,0) 78%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-sidebar-ink-2)' }}>
            {t('landing.plans.banner.eyebrow')}
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-0.8px' }}>
            {t('landing.plans.banner.title')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            {(['landing.plans.chip.cancel', 'landing.plans.chip.perUse', 'landing.plans.chip.crisis'] as const).map((chip) => (
              <span key={chip} style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--sk-color-sidebar-ink)' }}>
                {t(chip)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Centered Header */}
      <section style={{ padding: `50px ${PAGE_X} 0`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, maxWidth: '820px', fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.5px' }}>
          {t('landing.plans.h1')}
        </h1>
        <p style={{ margin: 0, maxWidth: '640px', fontSize: '16px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
          {t('landing.plans.intro')}
        </p>
      </section>

      {/* 4. Plan Cards — only what the server catalogue publishes */}
      <section aria-live="polite" style={{ padding: `34px ${PAGE_X} 0`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {state.status === 'loading' ? (
          <p role="status" style={{ margin: 0, fontSize: '14px', color: 'var(--sk-color-text-3)' }}>{t('landing.plans.loading')}</p>
        ) : null}
        {state.status === 'error' ? (
          <div role="alert" style={{ padding: '24px', borderRadius: '20px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('landing.plans.loadFailedTitle')}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>{t('landing.plans.loadFailedBody')}</span>
            <button type="button" onClick={reload} style={{ minHeight: '44px', padding: '0 20px', borderRadius: '12px', border: 'none', background: 'var(--sk-color-action)', color: 'var(--sk-color-on-action)', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer' }}>
              {t('common.tryAgain')}
            </button>
          </div>
        ) : null}
        {state.status === 'ready' && state.plans.length === 0 ? (
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--sk-color-text-3)' }}>{t('landing.plans.empty')}</p>
        ) : null}
        {state.status === 'ready' ? state.plans.map((p) => {
          const institution = p.audience === 'institution';
          const foot = footKey(p);
          return (
            <div
              key={p.id}
              style={{
                padding: '26px',
                borderRadius: '22px',
                background: 'var(--sk-color-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid var(--sk-color-rule-soft)'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--sk-color-text)' }}>
                {p.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1.4px', color: 'var(--sk-color-text)' }}>
                  {planPriceLabel(p, t)}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-text-3)' }}>
                  {p.period}
                </span>
              </div>

              {planPackageLabels(p, t).map((label) => (
                <span key={label} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sk-color-text)' }}>
                  {label}
                </span>
              ))}

              <span style={{ fontSize: '12px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-3)' }}>
                {p.description}
              </span>

              <span style={{ height: '1px', background: 'var(--sk-color-rule-soft)', margin: '10px 0 4px' }} />

              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0, listStyle: 'none' }}>
                {p.benefits.map((i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '4px 0' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sk-color-positive)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '3px' }} aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                    <span style={{ fontSize: '12.5px', lineHeight: 1.5, fontWeight: 500, color: 'var(--sk-color-text)' }}>
                      {i}
                    </span>
                  </li>
                ))}
              </ul>

              <span style={{ flexGrow: 1 }} />

              <a
                href={institution ? '/partnerships' : '/login'}
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  background: 'var(--sk-color-surface-3)',
                  color: 'var(--sk-color-action)'
                }}
              >
                {t(institution ? 'landing.plans.ctaInstitution' : 'landing.plans.ctaStudent')}
              </a>

              {foot ? (
                <span style={{ paddingTop: '9px', fontSize: '11px', lineHeight: 1.5, fontWeight: 600, color: 'var(--sk-color-text-3)' }}>
                  {t(foot)}
                </span>
              ) : null}
            </div>
          );
        }) : null}
      </section>

      {/* 5. Pay Per Use Grid — no prices typed here; each is shown where you book */}
      <section style={{ margin: `44px ${PAGE_X} 0`, padding: '34px 40px', borderRadius: '24px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', gap: '46px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.3px' }}>{t('landing.plans.payPerUse.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '28px', lineHeight: 1.16, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.9px' }}>
            {t('landing.plans.payPerUse.title')}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.plans.payPerUse.body')}
          </p>
        </div>
        <div style={{ flex: '1 1 400px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {payPerUse.map((p) => (
            <span key={p.label} style={{ padding: '18px', borderRadius: '14px', background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t(p.label)}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>{t(p.note)}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 6. Where Your Money Goes — no commission rate is configured, so none is shown */}
      <section style={{ margin: `40px ${PAGE_X} 0`, padding: '34px 40px', borderRadius: '24px', background: 'var(--sk-color-positive-bg)', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--sk-color-positive)', letterSpacing: '1.3px' }}>{t('landing.plans.money.eyebrow')}</span>
        <h2 style={{ margin: 0, maxWidth: '720px', fontSize: '28px', lineHeight: 1.16, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.9px' }}>
          {t('landing.plans.money.title')}
        </h2>
        <p style={{ margin: 0, maxWidth: '720px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
          {t('landing.plans.money.body')}
        </p>
        <p style={{ margin: 0, maxWidth: '720px', fontSize: '12.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-positive)' }}>
          {t('landing.plans.money.ranking')}
        </p>
      </section>

      {/* 7. What a Plan Never Does */}
      <section
        style={{
          margin: `44px ${PAGE_X} 0`,
          padding: '44px clamp(20px, 4vw, 50px)',
          borderRadius: '24px',
          background: 'var(--sk-color-brand-navy)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-2)', letterSpacing: '1.3px' }}>{t('landing.plans.never.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '31px', lineHeight: 1.14, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-1px' }}>
            {t('landing.plans.never.title')}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: 'var(--sk-color-sidebar-ink-3)' }}>
            {t('landing.plans.never.body')}
          </p>
        </div>
        <ul style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, listStyle: 'none' }}>
          {neverRules.map((n) => (
            <li key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: n.on ? 'var(--sk-color-positive-fill)' : 'var(--sk-color-danger-fill)' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink)' }}>{t(n.label)}</span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'var(--sk-color-sidebar-ink)'
                }}
              >
                {t(n.on ? 'landing.plans.never.tagPayFor' : 'landing.plans.never.tagNeverPaid')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. FAQs */}
      <section style={{ padding: `44px ${PAGE_X} 0`, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1px' }}>
          {t('landing.plans.faq.title')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={f.q}
                {...pressable(() => setOpenFaq(isOpen ? null : idx))} aria-expanded={isOpen}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  minHeight: '44px',
                  padding: '20px 0',
                  borderBottom: '1px solid var(--sk-color-rule)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t(f.q)}</span>
                  {isOpen && (
                    <span style={{ maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                      {t(f.a)}
                    </span>
                  )}
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--sk-color-text-3)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: '3px', transition: 'transform 0.2s ease' }}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Trust Pillars */}
      <section
        aria-label={t('landing.plans.pillars.label')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 4vw, 72px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: 'var(--sk-color-surface)',
          border: '1px solid var(--sk-color-rule-soft)'
        }}
      >
        {pillars.map((p) => (
          <div key={p.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>{t(p.title)}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)', maxWidth: '260px' }}>
              {t(p.body)}
            </span>
          </div>
        ))}
      </section>

      {/* 10. Footer. The newsletter form that used to sit here said "Subscribed!" without sending anything. */}
      <footer style={{ background: 'var(--sk-color-brand-navy)', padding: '0 clamp(16px, 4vw, 72px)', marginTop: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink)' }}>Student Kare</span>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--sk-color-sidebar-ink-3)' }}>{t('landing.campus.footer.tagline')}</span>
          </div>
          <nav aria-label="Student Kare" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-3)' }}>STUDENT KARE</span>
            <a href="/campuses" style={footerLink}>{t('landing.campus.nav.forCampuses')}</a>
            <a href="/plans" style={footerLink}>{t('landing.plans.footer.howWeMakeMoney')}</a>
            <a href="/partnerships" style={footerLink}>{t('landing.campus.nav.partnerships')}</a>
          </nav>
          <nav aria-label={t('landing.plans.footer.groupStudents')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-3)' }}>{t('landing.plans.footer.groupStudents')}</span>
            <a href="/lab-tests" style={footerLink}>{t('landing.plans.footer.bookLab')}</a>
            <a href="/consult" style={footerLink}>{t('landing.plans.footer.consult')}</a>
            <a href="/wellness" style={footerLink}>{t('landing.plans.footer.wellness')}</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink-3)' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '12.5px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', textDecoration: 'none' }}>
            {t('landing.plans.footer.crisis', { emergency: '112', telemanas: '14416' })}
          </a>
        </div>
      </footer>
    </div>
  );
}
