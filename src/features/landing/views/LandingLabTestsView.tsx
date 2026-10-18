import React, { useState } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { rupees } from '../viewmodel/LandingViewModel';
import './landing.css';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
}

interface Catalog {
  items: CatalogItem[];
  total: number;
}

/** Design tokens (DESIGN.md); illustration colours inside the SVG art stay literal. */
const C = {
  canvas: 'var(--sk-color-canvas)',
  surface: 'var(--sk-color-surface)',
  surface2: 'var(--sk-color-surface-2)',
  surface3: 'var(--sk-color-surface-3)',
  rule: 'var(--sk-color-rule)',
  ruleSoft: 'var(--sk-color-rule-soft)',
  text: 'var(--sk-color-text)',
  text2: 'var(--sk-color-text-2)',
  text3: 'var(--sk-color-text-3)',
  action: 'var(--sk-color-action)',
  focus: 'var(--sk-color-focus)',
  positive: 'var(--sk-color-positive)',
  positiveBg: 'var(--sk-color-positive-bg)',
  attention: 'var(--sk-color-attention)',
  attentionBg: 'var(--sk-color-attention-bg)',
  danger: 'var(--sk-color-danger)',
  dangerBg: 'var(--sk-color-danger-bg)',
  navy: 'var(--sk-color-brand-navy)',
  ink: 'var(--sk-color-sidebar-ink)',
  ink2: 'var(--sk-color-sidebar-ink-2)',
  ink3: 'var(--sk-color-sidebar-ink-3)',
  positiveFill: 'var(--sk-color-positive-fill)',
  dangerFill: 'var(--sk-color-danger-fill)',
} as const;

const L = 'landing.labtests.';
const k = (key: string): MessageKey => `${L}${key}` as MessageKey;

export function LandingLabTestsView(): React.ReactElement {
  const t = useT();
  const catalog = useApiResource<Catalog>('/catalog?kind=lab&limit=12');
  const apiItems = catalog.data?.items ?? [];

  // Interactive FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // SVG Paths
  const drop = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const heart = 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z';
  const body = 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 9h8l-1 5-1 7h-2l-1-5-1 5H8l-1-7z';
  const lungs = 'M12 4v9M8 8c-2 1-3 4-3 7a2 2 0 0 0 4 0c0-3-.5-5-1-7zM16 8c2 1 3 4 3 7a2 2 0 0 1-4 0c0-3 .5-5 1-7z';
  const pill = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const thyroid = 'M7 5c0 4 1 7 5 7s5-3 5-7M9 12l-1 7h8l-1-7';
  const phone = 'M5 4h3.5l1.6 4-2.2 1.4a11.5 11.5 0 0 0 5.7 5.7L15 12.9l4 1.6V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z';
  const doc = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';

  const nav = [
    { key: 'nav.discover', href: '/landing', on: false },
    { key: 'nav.wellness', href: '/shop', on: false },
    { key: 'nav.training', href: '/programs', on: false },
    { key: 'nav.labTests', href: '/lab-tests', on: true },
    { key: 'nav.findDoctor', href: '/consult', on: false },
    { key: 'nav.programmes', href: '/programs', on: false },
    { key: 'nav.plans', href: '/plans', on: false }
  ];

  // No WhatsApp booking line exists yet (the old link pointed at a placeholder
  // number), so only routes that lead somewhere real are offered.
  const quick = [
    { key: 'quick.uploadRx', href: '/prescriptions', path: doc, ink: C.attention, bg: C.attentionBg },
    { key: 'quick.healthDesk', href: '/emergency', path: phone, ink: C.action, bg: C.surface3 }
  ];

  // Category art tints: illustration colours, kept literal.
  const needs = [
    { key: 'need.fullBody', path: body, ink: '#059669', tint: '#ECFDF5', href: '/shop?kind=lab' },
    { key: 'need.fever', path: drop, ink: '#E11D48', tint: '#FFE4E6', href: '/shop?kind=lab' },
    { key: 'need.vitamin', path: pill, ink: '#7C6BA8', tint: '#EDEBFA', href: '/shop?kind=lab' },
    { key: 'need.thyroid', path: thyroid, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' },
    { key: 'need.anemia', path: heart, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { key: 'need.xray', path: lungs, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' }
  ];

  const proof = [
    { key: 'proof.block', bg: 'linear-gradient(145deg,#1F6F53,#134632)' },
    { key: 'proof.handoff', bg: 'linear-gradient(145deg,#3E4C7A,#20263F)' },
    { key: 'proof.redo', bg: 'linear-gradient(145deg,#7A5230,#3E2A18)' }
  ];

  const concerns = [
    { key: 'concern.fever', path: drop, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { key: 'concern.vitamins', path: pill, ink: '#7C6BA8', tint: '#EDEBFA', href: '/shop?kind=lab' },
    { key: 'concern.thyroid', path: thyroid, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' },
    { key: 'concern.anemia', path: heart, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { key: 'concern.liverKidney', path: drop, ink: '#5E8F73', tint: '#E6F0EA', href: '/shop?kind=lab' },
    { key: 'need.xray', path: lungs, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' }
  ];

  // Only what the catalogue publishes. No invented packages, prices,
  // turnaround times or fasting rules.
  const packages = apiItems.map((item) => ({
    id: item.id,
    name: item.name,
    tests: item.pack,
    offPct: item.mrpPaise > item.pricePaise ? Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100) : 0,
    mrp: item.mrpPaise > item.pricePaise ? rupees(item.mrpPaise) : '',
    price: rupees(item.pricePaise)
  }));

  const steps = [1, 2, 3, 4, 5].map((n) => ({ n: `0${n}`, title: k(`step${n}Title`), body: k(`step${n}Body`) }));

  const rules = [
    { key: 'rule.campusTold', on: false },
    { key: 'rule.ranking', on: false },
    { key: 'rule.critical', on: true },
    { key: 'rule.recollect', on: true }
  ];

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({ q: k(`faq${n}Q`), a: k(`faq${n}A`) }));

  const pillars = ['private', 'listed', 'near', 'price'] as const;

  const footerLink = { fontSize: '14px', fontWeight: 500, color: C.ink2, textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' } as const;
  const footerHead = { fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: C.ink3 } as const;
  const sectionH2 = { margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: C.text, letterSpacing: '-1px' } as const;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: C.canvas, display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* 1. Header */}
      <header style={{ minHeight: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: C.surface, display: 'flex', alignItems: 'center', gap: '24px', borderBottom: `1px solid ${C.ruleSoft}`, flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" aria-label="Studentkare" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minHeight: '44px' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span aria-hidden="true" style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label={t(k('nav.label'))}>
          {nav.map((n) => (
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
                  ? { background: C.surface3, color: C.action, fontWeight: 800 }
                  : { color: C.text2, fontWeight: 600 })
              }}
            >
              {t(k(n.key))}
            </a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ fontSize: '13.5px', fontWeight: 600, color: C.text2, textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          {t(k('signIn'))}
        </a>
      </header>

      {/* 2. Top Video Banner (decorative video; colours match the footage) */}
      <section
        aria-label={t(k('eyebrow'))}
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          height: '240px',
          borderRadius: '28px',
          background: '#06051A',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <video
          src="/assets/09075f98cb4208f2f1d5cf0b8bcbfa04.mp4"
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
            background: 'linear-gradient(90deg, #06051A 0%, #06051A 30%, rgba(6,5,26,0.55) 52%, rgba(6,5,26,0) 78%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '440px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: C.ink2, textTransform: 'uppercase' }}>
            {t(k('eyebrow'))}
          </span>
          <span style={{ fontSize: '28px', lineHeight: 1.2, fontWeight: 800, color: C.ink, letterSpacing: '-0.7px' }}>
            {t(k('bannerTitle'))}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            {['pillBlock', 'pillVault'].map((p) => (
              <span key={p} style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: C.ink }}>
                {t(k(p))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: '1 1 540px', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: C.text, letterSpacing: '-1.7px' }}>
            {t(k('heroTitle'))}
          </h1>

          <form
            method="get"
            action="/shop"
            role="search"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px', padding: '0 10px 0 20px', borderRadius: '16px', background: C.surface, border: `1px solid ${C.rule}`, boxSizing: 'border-box' }}
          >
            <input type="hidden" name="kind" value="lab" />
            <input
              type="search"
              name="q"
              placeholder={t(k('searchPlaceholder'))}
              aria-label={t(k('searchPlaceholder'))}
              style={{ flexGrow: 1, minWidth: 0, minHeight: '44px', border: 'none', outline: 'none', background: 'transparent', fontSize: '14.5px', fontWeight: 500, color: C.text }}
            />
            <button
              type="submit"
              aria-label={t(k('searchButton'))}
              style={{ width: '44px', height: '44px', borderRadius: '12px', background: C.action, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: 'var(--sk-color-on-action)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
            </button>
          </form>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {quick.map((q) => (
              <a
                key={q.key}
                href={q.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  height: '46px',
                  padding: '0 18px',
                  borderRadius: '13px',
                  background: q.bg,
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: C.text,
                  textDecoration: 'none'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={q.ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={q.path} />
                </svg>
                {t(k(q.key))}
              </a>
            ))}
          </div>

          <div style={{ padding: '22px', borderRadius: '18px', background: C.surface, display: 'flex', flexDirection: 'column', gap: '14px', border: `1px solid ${C.ruleSoft}` }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: C.text }}>
              {t(k('needsTitle'))}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {needs.map((n) => (
                <a
                  key={n.key}
                  href={n.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '14px',
                    borderRadius: '13px',
                    background: C.surface2,
                    border: `1px solid ${C.ruleSoft}`,
                    textDecoration: 'none'
                  }}
                >
                  <span style={{ flexGrow: 1, fontSize: '13px', lineHeight: 1.3, fontWeight: 700, color: C.text }}>
                    {t(k(n.key))}
                  </span>
                  <span aria-hidden="true" style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: n.tint }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={n.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={n.path} />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              height: '300px',
              borderRadius: '24px',
              background: 'radial-gradient(circle at 60% 40%, #FFFFFF 0%, #EEF2FF 60%, #E0E7FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img
              src="/assets/aa86cceef7f47ddd0066a108e627ed0b.png"
              alt={t(k('illustrationAlt'))}
              style={{ height: '280px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {proof.map((p) => (
              <div
                key={p.key}
                style={{
                  minHeight: '172px',
                  padding: '22px',
                  borderRadius: '18px',
                  background: p.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ flexGrow: 1 }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: C.ink, letterSpacing: '-0.3px' }}>
                  {t(k(`${p.key}Title`))}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>
                  {t(k(`${p.key}Meta`))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tests by What Is Going On */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={sectionH2}>
          {t(k('concernsTitle'))}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {concerns.map((c) => (
            <a
              key={c.key}
              href={c.href}
              style={{ display: 'flex', flexDirection: 'column', gap: '11px', textDecoration: 'none' }}
            >
              <span aria-hidden="true" style={{ height: '104px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.path} />
                </svg>
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: C.text, textAlign: 'center' }}>
                {t(k(c.key))}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 5. Published lab tests */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={sectionH2}>
            {t(k('packagesTitle'))}
          </h2>
          <a href="/shop?kind=lab" style={{ fontSize: '14px', fontWeight: 800, color: C.action, textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
            {t(k('seeAll'))}
          </a>
        </div>
        {catalog.loading ? (
          <p role="status" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text2 }}>{t(k('loading'))}</p>
        ) : catalog.error ? (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '18px', borderRadius: '14px', background: C.dangerBg }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.danger }}>{t(k('failed'))}</span>
            <button
              type="button"
              onClick={catalog.reload}
              style={{ minHeight: '44px', padding: '0 18px', borderRadius: '11px', border: `1px solid ${C.rule}`, background: C.surface, color: C.action, fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
            >
              {t('common.tryAgain')}
            </button>
          </div>
        ) : packages.length === 0 ? (
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text2 }}>{t(k('empty'))}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {packages.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '22px',
                  borderRadius: '18px',
                  background: C.surface,
                  border: `1px solid ${C.ruleSoft}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {p.offPct > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: C.positiveBg, fontSize: '10.5px', fontWeight: 800, color: C.positive }}>
                      {t(k('offPct'), { pct: p.offPct })}
                    </span>
                  </div>
                ) : null}
                <span style={{ fontSize: '17px', lineHeight: 1.25, fontWeight: 800, color: C.text, letterSpacing: '-0.4px' }}>
                  {p.name}
                </span>
                {p.tests ? (
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: C.text2 }}>
                    {p.tests}
                  </span>
                ) : null}
                <span style={{ flexGrow: 1 }} />
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px solid ${C.ruleSoft}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {p.mrp ? (
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: C.text3, textDecoration: 'line-through' }}>
                        {p.mrp}
                      </span>
                    ) : null}
                    <span style={{ fontSize: '21px', fontWeight: 800, color: C.text, letterSpacing: '-0.6px', fontVariantNumeric: 'tabular-nums' }}>
                      {p.price}
                    </span>
                  </div>
                  <a
                    href="/shop?kind=lab"
                    aria-label={t(k('bookSlotFor'), { name: p.name })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: '44px',
                      padding: '0 20px',
                      borderRadius: '11px',
                      background: C.action,
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--sk-color-on-action)',
                      textDecoration: 'none'
                    }}
                  >
                    {t(k('bookSlot'))}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. How Campus Collection Works */}
      <section
        style={{
          margin: '50px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(20px, 3vw, 36px)',
          borderRadius: '24px',
          background: C.surface,
          border: `1px solid ${C.ruleSoft}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '26px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <h2 style={sectionH2}>
            {t(k('howTitle'))}
          </h2>
          <p style={{ margin: 0, maxWidth: '700px', fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: C.text2 }}>
            {t(k('howLede'))}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: '11px', paddingTop: '18px', borderTop: `3px solid ${C.focus}` }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: C.action, letterSpacing: '1px' }}>
                {s.n}
              </span>
              <span style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>
                {t(s.title)}
              </span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: C.text2 }}>
                {t(s.body)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. About Your Results */}
      <section
        style={{
          margin: '40px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(24px, 3.5vw, 44px) clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: C.navy,
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.ink2, letterSpacing: '1.3px', textTransform: 'uppercase' }}>
            {t(k('resultsEyebrow'))}
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 31px)', lineHeight: 1.14, fontWeight: 800, color: C.ink, letterSpacing: '-1px' }}>
            {t(k('resultsTitle'))}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: C.ink3 }}>
            {t(k('resultsLede'))}
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {rules.map((r, i) => (
            <div
              key={r.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                padding: '13px 0',
                borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none'
              }}
            >
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? C.positiveFill : C.dangerFill }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: C.ink }}>
                {t(k(r.key))}
              </span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  ...(r.on
                    ? { background: C.positiveBg, color: C.positive }
                    : { background: C.dangerBg, color: C.danger })
                }}
              >
                {t(k(r.on ? 'tagAlways' : 'tagNever'))}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Questions Students Actually Ask (Accordion) */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={sectionH2}>
          {t(k('faqTitle'))}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={f.q} style={{ display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${C.rule}` }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', minHeight: '44px', padding: '20px 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
                    {t(f.q)}
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
                      color: C.text3,
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      marginTop: '3px'
                    }}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen ? (
                  <p style={{ margin: '0 0 20px', maxWidth: '900px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: C.text2 }}>
                    {t(f.a)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Why Students Trust Student Kare (pillar art is illustration; colours kept) */}
      <section
        aria-label={t(k('trustLabel'))}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 3.5vw, 44px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: C.surface,
          border: `1px solid ${C.ruleSoft}`
        }}
      >
        {pillars.map((p, i) => (
          <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
            <PillarArt index={i} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>{t(k(`trust.${p}Title`))}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: C.text2, maxWidth: '260px' }}>
              {t(k(`trust.${p}Body`))}
            </span>
          </div>
        ))}
      </section>

      {/* 10. Get the App Banner */}
      <section
        aria-label={t(k('appLabel'))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          margin: '40px clamp(16px, 3.5vw, 44px) 64px',
          padding: '0 0 0 clamp(24px, 4vw, 56px)',
          minHeight: '420px',
          borderRadius: '28px',
          background: C.surface3,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: C.action, textTransform: 'uppercase' }}>
            {t(k('appEyebrow'))}
          </span>
          <span style={{ fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: C.text, letterSpacing: '-0.9px', maxWidth: '520px' }}>
            {t(k('appTitle'))}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'appHostel', icon: <><circle cx="12" cy="10" r="3" /><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /></> },
              { key: 'appVault', icon: <><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M12 9v6M9 12h6" /></> },
              { key: 'appReports', icon: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /> }
            ].map((row) => (
              <span key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: C.text }}>
                <span aria-hidden="true" style={{ width: '34px', height: '34px', borderRadius: '11px', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: C.action }}>
                    {row.icon}
                  </svg>
                </span>
                {t(k(row.key))}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
            {[
              { over: 'portalOver', name: 'portal', icon: <><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M12 6v6l4 2" /></> },
              { over: 'mobileOver', name: 'mobile', icon: <><rect x="5" y="2" width="14" height="20" rx="3" /><line x1="12" y1="18" x2="12.01" y2="18" /></> }
            ].map((b) => (
              <a
                key={b.name}
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: '184px',
                  height: '54px',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  background: C.navy,
                  color: C.ink,
                  textDecoration: 'none'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {b.icon}
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>{t(k(b.over))}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{t(k(b.name))}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Phone Graphic (illustration) */}
        <div aria-hidden="true" style={{ alignSelf: 'flex-end', flexShrink: 0, marginRight: '30px' }}>
          <svg width="340" height="310" viewBox="0 0 340 310" aria-hidden="true">
            <defs>
              <radialGradient id="apbmintg" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <radialGradient id="apbind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="apbsh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
              <linearGradient id="apbbez" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4B4F73" /><stop offset=".35" stopColor="#1E1B4B" /><stop offset="1" stopColor="#0B0A24" /></linearGradient>
              <linearGradient id="apbbez2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B93FF" /><stop offset=".45" stopColor="#4F46E5" /><stop offset="1" stopColor="#241A8F" /></linearGradient>
              <linearGradient id="apbscr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EEF1FF" /></linearGradient>
              <linearGradient id="apbscr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4F5FF" /><stop offset="1" stopColor="#DDE3FF" /></linearGradient>
              <linearGradient id="apbline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8B93FF" /><stop offset="1" stopColor="#3525CD" /></linearGradient>
              <linearGradient id="apbarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366F1" stopOpacity=".35" /><stop offset="1" stopColor="#6366F1" stopOpacity="0" /></linearGradient>
            </defs>
            <ellipse cx="170" cy="300" rx="150" ry="12" fill="url(#apbsh)" />
            <g transform="rotate(-6 110 170)">
              <rect x="34" y="28" width="164" height="300" rx="30" fill="url(#apbbez)" />
              <rect x="40" y="33" width="152" height="290" rx="25" fill="none" stroke="#FFFFFF" strokeOpacity=".18" strokeWidth="1.5" />
              <rect x="44" y="40" width="144" height="280" rx="22" fill="url(#apbscr)" />
              <rect x="92" y="47" width="48" height="11" rx="5.5" fill="#0B0A24" />
              <rect x="56" y="70" width="84" height="10" rx="5" fill="#131B2E" />
              <rect x="56" y="86" width="56" height="7" rx="3.5" fill="#C7C4D8" />
              <rect x="56" y="104" width="120" height="34" rx="12" fill="url(#apbind)" />
              <rect x="66" y="116" width="54" height="9" rx="4.5" fill="#FFFFFF" opacity=".9" />
              <rect x="56" y="148" width="56" height="50" rx="12" fill="#EEF2FF" />
              <rect x="120" y="148" width="56" height="50" rx="12" fill="#ECFDF5" />
              <path d="M64 184l10-9 9 6 16-14" stroke="#3525CD" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="148" cy="173" r="13" fill="url(#apbmintg)" />
              <path d="M141 173l5 5 9-10" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g transform="rotate(5 240 180)">
              <rect x="160" y="62" width="164" height="270" rx="30" fill="url(#apbbez2)" />
              <rect x="166" y="67" width="152" height="260" rx="25" fill="none" stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="1.5" />
              <rect x="170" y="74" width="144" height="252" rx="22" fill="url(#apbscr2)" />
              <text x="184" y="104" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="12" fontWeight="800" fill="#1E1B4B">Vitamin D &amp; B12</text>
              <text x="184" y="120" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9" fontWeight="600" fill="#464555">{t(k('phoneInVault'))}</text>
              <rect x="182" y="132" width="120" height="74" rx="14" fill="#FFFFFF" />
              <path d="M190 190l18-14 16 8 20-20 20 6 22-16V200H190z" fill="url(#apbarea)" />
              <path d="M190 190l18-14 16 8 20-20 20 6 22-16" stroke="url(#apbline)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="286" cy="154" r="4.5" fill="#FFFFFF" stroke="#3525CD" strokeWidth="2.5" />
              <rect x="182" y="216" width="120" height="30" rx="15" fill="url(#apbind)" />
              <text x="242" y="235" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10.5" fontWeight="800" fill="#FFFFFF">{t(k('phoneOpenReport'))}</text>
            </g>
            <g transform="translate(288 26)">
              <circle r="20" fill="url(#apbmintg)" />
              <path d="M-8 0l5 5 10-11" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      </section>

      {/* 11. Footer with Campus Updates */}
      <footer style={{ background: C.navy, padding: '0 clamp(16px, 3.5vw, 44px)' }}>
        {/*
          There is no newsletter service behind this yet. The old form showed
          "Subscribed!" without sending anything, so it now says it is not open.
        */}
        <section
          aria-label={t(k('nlLabel'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            padding: '40px clamp(16px, 3.5vw, 44px)',
            transform: 'translateY(-1px)',
            borderRadius: '0 0 28px 28px',
            background: C.action,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '640px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-on-action)', textTransform: 'uppercase' }}>
              {t(k('nlEyebrow'))}
            </span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: 'var(--sk-color-on-action)', letterSpacing: '-0.6px' }}>
              {t(k('nlTitle'))}
            </span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-on-action)' }}>
              {t(k('nlNotOpen'))}
            </span>
          </div>
        </section>

        {/* 4 Column links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <a href="/landing" aria-label="Studentkare" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minHeight: '44px' }}>
              <span aria-hidden="true" style={{ fontSize: '19px', fontWeight: 800, color: C.ink, letterSpacing: '-0.4px' }}>
                Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
              </span>
            </a>
            <span style={{ fontSize: '13px', lineHeight: 1.6, fontWeight: 500, color: C.ink3, maxWidth: '230px' }}>
              {t(k('footerTagline'))}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: C.ink2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              SNIST · Miyapur, Hyderabad
            </span>
          </div>

          <nav aria-label="Studentkare" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={footerHead}>STUDENT KARE</span>
            <a href="/campuses" style={footerLink}>{t(k('foot.about'))}</a>
            <a href="/plans" style={footerLink}>{t(k('foot.money'))}</a>
            <a href="/partnerships" style={footerLink}>{t(k('foot.careers'))}</a>
            <a href="/partnerships" style={footerLink}>{t(k('foot.press'))}</a>
            <a href="/help" style={footerLink}>{t(k('foot.contact'))}</a>
          </nav>

          <nav aria-label={t(k('foot.forStudents'))} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...footerHead, textTransform: 'uppercase' }}>{t(k('foot.forStudents'))}</span>
            <a href="/lab-tests" style={footerLink}>{t(k('foot.bookLab'))}</a>
            <a href="/consult" style={footerLink}>{t(k('foot.consult'))}</a>
            <a href="/programs" style={footerLink}>{t(k('foot.programmes'))}</a>
            <a href="/plans" style={footerLink}>{t(k('nav.plans'))}</a>
            <a href="/vault" style={footerLink}>{t(k('foot.vault'))}</a>
          </nav>

          <nav aria-label={t(k('foot.forPartners'))} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...footerHead, textTransform: 'uppercase' }}>{t(k('foot.forPartners'))}</span>
            <a href="/campuses" style={footerLink}>{t(k('foot.bringCampus'))}</a>
            <a href="/clinicians" style={footerLink}>{t(k('foot.joinClinician'))}</a>
            <a href="/partnerships" style={footerLink}>{t(k('foot.listLab'))}</a>
            <a href="/partnerships" style={footerLink}>{t(k('foot.partnerships'))}</a>
          </nav>

          <nav aria-label={t(k('foot.policies'))} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...footerHead, textTransform: 'uppercase' }}>{t(k('foot.policies'))}</span>
            <a href="/privacy" style={footerLink}>{t(k('foot.privacy'))}</a>
            <a href="/terms" style={footerLink}>{t(k('foot.terms'))}</a>
            <a href="/plans" style={footerLink}>{t(k('foot.firewall'))}</a>
            <a href="/help" style={footerLink}>{t(k('foot.grievance'))}</a>
            <a href="/vault" style={footerLink}>{t(k('foot.export'))}</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: C.ink3 }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 11px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', fontSize: '11.5px', fontWeight: 700, color: C.ink2 }}>
            <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '999px', background: C.positiveFill }} />
            {t(k('foot.badgeOwned'))}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 11px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', fontSize: '11.5px', fontWeight: 700, color: C.ink2 }}>
            {t(k('foot.badgeListed'))}
          </span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: C.ink, textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {t(k('crisisLead'))} <span style={{ fontWeight: 800 }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800 }}>14416</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

/** The four trust-pillar illustrations. Pure art: literal colours, hidden from assistive tech. */
function PillarArt({ index }: { index: number }): React.ReactElement {
  if (index === 0) {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <defs>
          <radialGradient id="bt0ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
          <linearGradient id="bt0gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
          <linearGradient id="bt0gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
          <radialGradient id="bt0sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt0sh)" />
        <path d="M42 6 16 16v20c0 18 11 31 26 37 15-6 26-19 26-37V16z" fill="url(#bt0ind)" />
        <path d="M42 6 16 16v20c0 6 1 11 4 16C22 30 30 16 42 10z" fill="url(#bt0gloss)" opacity=".7" />
        <path d="M33 38v-6a9 9 0 0 1 18 0v6" fill="none" stroke="url(#bt0gold)" strokeWidth="5" strokeLinecap="round" />
        <rect x="28" y="36" width="28" height="22" rx="6" fill="url(#bt0gold)" />
        <rect x="31" y="38" width="22" height="6" rx="3" fill="#FFFFFF" opacity=".45" />
        <circle cx="42" cy="47" r="3.2" fill="#7A4A08" />
        <rect x="40.6" y="48" width="2.8" height="6" rx="1.4" fill="#7A4A08" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <defs>
          <radialGradient id="bt1ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
          <linearGradient id="bt1gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
          <radialGradient id="bt1mint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
          <radialGradient id="bt1sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt1sh)" />
        <path d="M28 44 20 72l11-4 6 10 8-27zM56 44l8 28-11-4-6 10-8-27z" fill="url(#bt1ind)" />
        <circle cx="42" cy="34" r="25" fill="url(#bt1gold)" />
        <circle cx="42" cy="34" r="18" fill="url(#bt1mint)" />
        <path d="M33 34l6 6 12-13" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="33" cy="20" rx="9" ry="5" fill="#FFFFFF" opacity=".5" transform="rotate(-25 33 20)" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <defs>
          <radialGradient id="bt2ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
          <radialGradient id="bt2sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt2sh)" />
        <path d="M10 70V36l22-15 22 15v34z" fill="#C7D2FE" />
        <path d="M32 21l22 15v34H32z" fill="#A5B4FC" />
        <path d="M6 38 32 18l26 20" fill="none" stroke="url(#bt2ind)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="17" y="42" width="9" height="9" rx="2" fill="#FFFFFF" />
        <rect x="38" y="42" width="9" height="9" rx="2" fill="#E0E7FF" />
        <rect x="25" y="56" width="14" height="14" rx="2" fill="url(#bt2ind)" />
        <path d="M64 4c-9 0-15 7-15 14 0 10 15 25 15 25s15-15 15-25c0-7-6-14-15-14z" fill="url(#bt2ind)" />
        <circle cx="64" cy="18" r="5.5" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
      <defs>
        <linearGradient id="bt3paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9DEFA" /></linearGradient>
        <radialGradient id="bt3mint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
        <radialGradient id="bt3sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt3sh)" />
      <path d="M22 6h40v64l-6-4-7 4-7-4-7 4-7-4-6 4z" fill="url(#bt3paper)" stroke="#C7D2FE" strokeWidth="1.5" />
      <path d="M22 6h40v8H22z" fill="#EEF2FF" />
      <circle cx="42" cy="34" r="15" fill="url(#bt3mint)" />
      <path d="M36 26h12M36 26c5 0 8 2.5 8 6s-3 6-8 6h-1l11 9M36 32h12" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 56h24" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
