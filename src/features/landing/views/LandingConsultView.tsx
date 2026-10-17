import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

/**
 * Consult a doctor (public page).
 *
 * What was taken out, and why:
 * - Fixed per-speciality fees and "₹149 on Premium" discounts. No consult fee
 *   or plan discount exists in any data this page can read, so the numbers
 *   were invented. The page now says the fee is the doctor's and is shown
 *   before booking.
 * - "NMC-registered" and "verified against the register". Nothing checks a
 *   registration against any register (the trust pillar below already said so).
 * - "Usually seen within 30 minutes": a service level nobody has committed to.
 * - A cancellation/refund policy that is not configured anywhere.
 * - App Store / Google Play badges that linked to /login: nothing is published
 *   to either store.
 * - A newsletter form whose "Subscribed!" was set locally and sent nothing.
 */

const SPEC_PATHS = {
  stetho: 'M6 4v6a6 6 0 0 0 12 0V4',
  rx: 'M7 20V8h4a3 3 0 0 1 0 6H7m6 0 5 6M14 15l4-4',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  drop: 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z',
  body: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 9h8l-1 5-1 7h-2l-1-5-1 5H8l-1-7z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  lock: 'M5 11h14v9H5zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
} as const;

const tok = (name: string): string => `var(--sk-color-${name})`;

/** LandingConsultNativeView keeps the same lists, so both say the same thing. */
const CONSULT_PROMISES = ['price', 'rx', 'private'] as const;
const CONSULT_SPECS = ['general', 'fever', 'report', 'mental', 'skin', 'women'] as const;
const CONSULT_RULES = [
  { key: 'shared', on: true },
  { key: 'note', on: true },
  { key: 'wholeVault', on: false },
  { key: 'expired', on: false },
  { key: 'commerce', on: false },
] as const;
const CONSULT_FAQS = ['eduId', 'rx', 'again', 'cancel', 'private', 'emergency'] as const;

const promiseKey = (k: (typeof CONSULT_PROMISES)[number]) => `landing.consult.promise.${k}` as MessageKey;
const specKey = (k: (typeof CONSULT_SPECS)[number]) => `landing.consult.spec.${k}` as MessageKey;
const ruleKey = (k: (typeof CONSULT_RULES)[number]['key']) => `landing.consult.rule.${k}` as MessageKey;
const faqKey = (k: (typeof CONSULT_FAQS)[number], part: 'q' | 'a') => `landing.consult.faq.${k}.${part}` as MessageKey;

const PROMISE_STYLE: Record<(typeof CONSULT_PROMISES)[number], { path: string; ink: string; tint: string }> = {
  price: { path: SPEC_PATHS.clock, ink: tok('focus'), tint: tok('surface-3') },
  rx: { path: SPEC_PATHS.rx, ink: tok('positive'), tint: tok('positive-bg') },
  private: { path: SPEC_PATHS.lock, ink: tok('info'), tint: tok('surface-2') },
};

const SPEC_STYLE: Record<(typeof CONSULT_SPECS)[number], { path: string; ink: string; tint: string }> = {
  general: { path: SPEC_PATHS.stetho, ink: tok('focus'), tint: tok('surface-3') },
  fever: { path: SPEC_PATHS.drop, ink: tok('danger'), tint: tok('danger-bg') },
  report: { path: SPEC_PATHS.rx, ink: tok('focus'), tint: tok('surface-3') },
  mental: { path: SPEC_PATHS.brain, ink: tok('info'), tint: tok('surface-2') },
  skin: { path: SPEC_PATHS.spark, ink: tok('attention'), tint: tok('attention-bg') },
  women: { path: SPEC_PATHS.body, ink: tok('positive'), tint: tok('positive-bg') },
};

const NAV: ReadonlyArray<{ key: MessageKey; href: string; on: boolean }> = [
  { key: 'landing.consult.nav.discover', href: '/landing', on: false },
  { key: 'landing.consult.nav.wellness', href: '/shop', on: false },
  { key: 'landing.consult.nav.training', href: '/programs', on: false },
  { key: 'landing.consult.nav.labTests', href: '/lab-tests', on: false },
  { key: 'landing.consult.nav.findDoctor', href: '/consult', on: true },
  { key: 'landing.consult.nav.programmes', href: '/programs', on: false },
  { key: 'landing.consult.nav.plans', href: '/plans', on: false },
];

const PILLARS = ['private', 'listed', 'near', 'price'] as const;

const chip: React.CSSProperties = {
  height: '30px', padding: '0 12px', borderRadius: '999px', background: tok('surface'), border: `1px solid ${tok('rule')}`,
  display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: tok('info'),
};
const footerLink: React.CSSProperties = { fontSize: '14px', color: tok('sidebar-ink-2'), textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' };

export function LandingConsultView(): React.ReactElement {
  const t = useT();
  // Interactive FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // No clinician roster is published yet. This used to list three invented
  // doctors with made-up NMC registration numbers as "on shift right now".
  const docs: { initials: string; name: string; spec: string; when: string }[] = [];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: tok('canvas'), display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* 1. Header */}
      <header style={{ minHeight: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: tok('surface'), display: 'flex', alignItems: 'center', gap: '24px', borderBottom: `1px solid ${tok('rule-soft')}`, flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" aria-label={t('landing.consult.nav.home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minHeight: '44px' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: tok('text'), letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label={t('landing.consult.nav.label')}>
          {NAV.map((n) => (
            <a
              key={n.key}
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
                ...(n.on
                  ? { background: tok('surface-3'), color: tok('action'), fontWeight: 800 }
                  : { color: tok('text-2'), fontWeight: 600 })
              }}
            >
              {t(n.key)}
            </a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ fontSize: '13.5px', fontWeight: 600, color: tok('text-2'), textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          {t('landing.consult.signIn')}
        </a>
      </header>

      {/* 2. Top Banner */}
      <section
        aria-label={t('landing.consult.banner.label')}
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '240px',
          borderRadius: '28px',
          background: `linear-gradient(110deg, ${tok('surface-3')} 0%, ${tok('surface')} 45%, ${tok('danger-bg')} 100%)`,
          border: `1px solid ${tok('rule-soft')}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
          padding: '24px clamp(20px, 3vw, 40px)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: tok('action') }}>
            {t('landing.consult.eyebrow')}
          </span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: tok('text'), letterSpacing: '-0.7px' }}>
            {t('landing.consult.banner.title')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={chip}>{t('landing.consult.chip.mode')}</span>
            <span style={chip}>{t('landing.consult.chip.price')}</span>
          </div>
        </div>

        {/* Video consult illustration (decorative; illustration colours left as drawn) */}
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'flex-end', minWidth: '300px' }}>
          <svg width="100%" height="200" viewBox="0 0 480 200" fill="none" style={{ maxWidth: '480px' }} aria-hidden="true">
            <rect x="20" y="20" width="280" height="160" rx="16" fill="#1E1B4B" />
            <circle cx="160" cy="85" r="32" fill="#FDBA74" />
            <path d="M120 160c4-28 20-40 40-40s36 12 40 40z" fill="#FFFFFF" />
            <rect x="36" y="36" width="56" height="22" rx="11" fill="#E11D48" />
            <text x="50" y="51" fill="#FFFFFF" fontSize="10" fontWeight="800">{t('landing.consult.illus.live')}</text>
            <rect x="320" y="40" width="140" height="34" rx="12" fill="#FFFFFF" stroke="#EEF2FF" />
            <text x="332" y="61" fill="#131B2E" fontSize="11" fontWeight="700">{t('landing.consult.illus.patient')}</text>
            <rect x="300" y="85" width="160" height="34" rx="12" fill="#4F46E5" />
            <text x="312" y="106" fill="#FFFFFF" fontSize="11" fontWeight="700">{t('landing.consult.illus.doctor')}</text>
            <rect x="320" y="130" width="140" height="34" rx="12" fill="#ECFDF5" />
            <text x="332" y="151" fill="#047857" fontSize="11" fontWeight="700">{t('landing.consult.illus.rx')}</text>
          </svg>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: tok('text'), letterSpacing: '-1.7px' }}>
            {t('landing.consult.hero.title')}
          </h1>
          <p style={{ margin: 0, maxWidth: '560px', fontSize: '17px', lineHeight: 1.6, fontWeight: 500, color: tok('text-2') }}>
            {t('landing.consult.hero.lede')}
          </p>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {CONSULT_PROMISES.map((k) => {
              const p = PROMISE_STYLE[k];
              return (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.tint, color: p.ink }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={p.path} />
                    </svg>
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: tok('text') }}>{t(promiseKey(k))}</span>
                </span>
              );
            })}
          </div>

          <a
            href="/appointments"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              height: '56px',
              padding: '0 30px',
              borderRadius: '13px',
              background: tok('action'),
              fontSize: '15.5px',
              fontWeight: 800,
              color: tok('on-action'),
              textDecoration: 'none'
            }}
          >
            {t('landing.consult.hero.cta')}
          </a>
        </div>

        {/* Doctor Shift Preview Card */}
        <div style={{ flex: '1 1 380px', padding: '26px', borderRadius: '22px', background: tok('surface'), display: 'flex', flexDirection: 'column', gap: '14px', border: `1px solid ${tok('rule-soft')}`, boxSizing: 'border-box' }}>
          <img
            src="/assets/46011255169a19dbc1060f1bd00e5fd4.png"
            alt=""
            aria-hidden="true"
            style={{ alignSelf: 'center', height: '180px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, color: tok('text-3'), letterSpacing: '1.2px' }}>
            {t('landing.consult.shift.title')}
          </span>
          {docs.length === 0 && (
            <span style={{ fontSize: '13px', fontWeight: 500, color: tok('text-3') }}>{t('landing.consult.shift.empty')}</span>
          )}
          {docs.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 0', borderBottom: `1px solid ${tok('rule-soft')}` }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: tok('surface-3'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 800, color: tok('action'), flexShrink: 0 }}>
                {d.initials}
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: tok('text') }}>{d.name}</span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: tok('positive-fill') }} />
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 500, color: tok('text-3') }}>{d.spec}</span>
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: tok('positive') }}>{d.when}</span>
            </div>
          ))}
          <span style={{ fontSize: '11.5px', lineHeight: 1.55, fontWeight: 500, color: tok('text-3') }}>
            {t('landing.consult.shift.order')}
          </span>
        </div>
      </section>

      {/* 4. Specialities Grid */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: tok('text'), letterSpacing: '-1px' }}>
          {t('landing.consult.specs.title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {CONSULT_SPECS.map((k) => {
            const s = SPEC_STYLE[k];
            return (
              <a
                key={k}
                href="/appointments"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: tok('surface'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '11px',
                  textDecoration: 'none',
                  border: `1px solid ${tok('rule-soft')}`
                }}
              >
                <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.tint }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.3, fontWeight: 700, color: tok('text') }}>{t(specKey(k))}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: tok('text-2') }}>{t('landing.consult.spec.fee')}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: tok('text-3') }}>
                  {t(k === 'mental' ? 'landing.consult.spec.crisisFree' : 'landing.consult.spec.feeNote')}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* 5. What the Doctor Can See (Boundary & Consent) */}
      <section
        style={{
          margin: '46px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(24px, 3.5vw, 44px) clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: tok('brand-navy'),
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: tok('positive-fill'), letterSpacing: '1.3px' }}>
            {t('landing.consult.rules.eyebrow')}
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 31px)', lineHeight: 1.14, fontWeight: 800, color: tok('sidebar-ink'), letterSpacing: '-1px' }}>
            {t('landing.consult.rules.title')}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: tok('sidebar-ink-2') }}>
            {t('landing.consult.rules.lede')}
          </p>
        </div>
        <ul style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, listStyle: 'none' }}>
          {CONSULT_RULES.map((r, i) => (
            <li
              key={r.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                padding: '13px 0',
                borderBottom: i < CONSULT_RULES.length - 1 ? `1px solid ${tok('sidebar-ink-3')}` : 'none'
              }}
            >
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? tok('positive-fill') : tok('danger-fill') }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: tok('sidebar-ink') }}>
                {t(ruleKey(r.key))}
              </span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  ...(r.on
                    ? { background: tok('positive-bg'), color: tok('positive') }
                    : { background: tok('danger-bg'), color: tok('danger') })
                }}
              >
                {t(r.on ? 'landing.consult.tag.yes' : 'landing.consult.tag.never')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Questions Students Actually Ask (Accordion) */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: tok('text'), letterSpacing: '-1px' }}>
          {t('landing.consult.faq.title')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CONSULT_FAQS.map((k, idx) => {
            const isOpen = openFaq === idx;
            const panelId = `sk-consult-faq-${k}`;
            return (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: `1px solid ${tok('rule')}` }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', minHeight: '44px', padding: '8px 0', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: tok('text') }}>
                    {t(faqKey(k, 'q'))}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      color: tok('text-3'),
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen ? (
                  <p id={panelId} style={{ margin: '2px 0 12px', maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: tok('text-2') }}>
                    {t(faqKey(k, 'a'))}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Clinician Recruitment Banner */}
      <section
        style={{
          margin: '46px clamp(16px, 3.5vw, 44px) 0',
          padding: '40px clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: tok('surface-3'),
          display: 'flex',
          alignItems: 'center',
          gap: '46px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: tok('action'), letterSpacing: '1.3px' }}>
            {t('landing.consult.recruit.eyebrow')}
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.14, fontWeight: 800, color: tok('text'), letterSpacing: '-1.1px' }}>
            {t('landing.consult.recruit.title')}
          </h2>
          <p style={{ margin: 0, maxWidth: '620px', fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: tok('text-2') }}>
            {t('landing.consult.recruit.body')}
          </p>
        </div>
        <img
          src="/assets/b859fcf30b096631cfd1de1b6c0b839f.png"
          alt=""
          aria-hidden="true"
          style={{ height: '220px', width: 'auto', flexShrink: 0, objectFit: 'contain' }}
        />
        <a
          href="/clinicians"
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 30px',
            borderRadius: '13px',
            background: tok('action'),
            fontSize: '15px',
            fontWeight: 800,
            color: tok('on-action'),
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          {t('landing.consult.recruit.cta')}
        </a>
      </section>

      {/* 8. Trust Pillars */}
      <section
        aria-label={t('landing.consult.pillars.label')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 3.5vw, 44px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: tok('surface'),
          border: `1px solid ${tok('rule-soft')}`
        }}
      >
        {PILLARS.map((k) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: tok('text'), letterSpacing: '-0.3px' }}>{t(`landing.consult.pillar.${k}.title` as MessageKey)}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: tok('text-2'), maxWidth: '260px' }}>
              {t(`landing.consult.pillar.${k}.body` as MessageKey)}
            </span>
          </div>
        ))}
      </section>

      {/* 9. Get started (was two store badges that linked to /login) */}
      <section
        aria-label={t('landing.consult.app.label')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          margin: '40px clamp(16px, 3.5vw, 44px) 64px',
          padding: '0 clamp(24px, 4vw, 56px)',
          borderRadius: '28px',
          background: `linear-gradient(135deg, ${tok('surface-3')} 0%, ${tok('rule')} 100%)`,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: tok('action') }}>
            {t('landing.consult.app.eyebrow')}
          </span>
          <span style={{ fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: tok('text'), letterSpacing: '-0.9px', maxWidth: '520px' }}>
            {t('landing.consult.app.title')}
          </span>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: tok('text-2'), maxWidth: '520px' }}>
            {t('landing.consult.app.body')}
          </p>
          <a
            href="/login"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              height: '54px',
              padding: '0 26px',
              borderRadius: '14px',
              background: tok('action'),
              fontSize: '15px',
              fontWeight: 800,
              color: tok('on-action'),
              textDecoration: 'none'
            }}
          >
            {t('landing.consult.app.cta')}
          </a>
        </div>
      </section>

      {/* 10. Footer */}
      <footer style={{ background: tok('brand-navy'), padding: '0 clamp(16px, 3.5vw, 44px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: tok('sidebar-ink') }}>Studentkare</span>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: tok('sidebar-ink-3') }}>{t('landing.consult.footer.tagline')}</span>
          </div>
          <nav aria-label={t('landing.consult.footer.brandLinks')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: tok('sidebar-ink-3') }}>{t('landing.consult.footer.brandHeading')}</span>
            <a href="/campuses" style={footerLink}>{t('landing.consult.footer.about')}</a>
            <a href="/plans" style={footerLink}>{t('landing.consult.footer.money')}</a>
            <a href="/help" style={footerLink}>{t('landing.consult.footer.contact')}</a>
          </nav>
          <nav aria-label={t('landing.consult.footer.studentLinks')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: tok('sidebar-ink-3') }}>{t('landing.consult.footer.studentHeading')}</span>
            <a href="/lab-tests" style={footerLink}>{t('landing.consult.footer.lab')}</a>
            <a href="/consult" style={footerLink}>{t('landing.consult.footer.consult')}</a>
            <a href="/vault" style={footerLink}>{t('landing.consult.footer.vault')}</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: `1px solid ${tok('sidebar-ink-3')}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: tok('sidebar-ink-3') }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: tok('sidebar-ink-2'), textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {t('landing.consult.footer.crisis')} <span style={{ fontWeight: 800, color: tok('sidebar-ink') }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800, color: tok('sidebar-ink') }}>14416</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
