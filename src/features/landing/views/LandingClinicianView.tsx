import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

/**
 * For clinicians (web). The queue on this page is an illustration and is now
 * labelled as one — it used to read "YOUR QUEUE, RIGHT NOW" over made-up
 * results. The illustration keeps its own palette; everything else uses tokens.
 */
const PAGE_X = 'clamp(16px, 4vw, 64px)';

type Flag = 'HH' | 'LL' | 'H' | 'N';

const FLAG_STYLE: Record<Flag, { bg: string; color: string }> = {
  HH: { bg: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)' },
  LL: { bg: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)' },
  H: { bg: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-attention)' },
  N: { bg: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)' }
};

export function LandingClinicianView(): React.ReactElement {
  const t = useT();

  // Example rows only. Test names and units are not translated.
  const queue: { flag: Flag; name: string; meta: string; value: string; urgent: boolean }[] = [
    { flag: 'HH', name: 'Potassium 6.8 mmol/L', meta: t('landing.clinician.queue.released', { minutes: 11 }), value: t('landing.clinician.queue.ref', { range: '3.5–5.1' }), urgent: true },
    { flag: 'LL', name: 'Haemoglobin 7.1 g/dL', meta: t('landing.clinician.queue.released', { minutes: 38 }), value: t('landing.clinician.queue.ref', { range: '12.0–15.5' }), urgent: true },
    { flag: 'H', name: 'TSH 9.4 mIU/L', meta: t('landing.clinician.queue.acknowledged', { hours: 2 }), value: t('landing.clinician.queue.ref', { range: '0.4–4.0' }), urgent: false },
    { flag: 'N', name: 'Complete Blood Count', meta: t('landing.clinician.queue.allInRange', { count: 21 }), value: t('landing.clinician.queue.inRange'), urgent: false }
  ];

  const cards: { eyebrow: MessageKey; title: MessageKey; body: MessageKey }[] = [
    { eyebrow: 'landing.clinician.card.criticalEyebrow', title: 'landing.clinician.card.criticalTitle', body: 'landing.clinician.card.criticalBody' },
    { eyebrow: 'landing.clinician.card.timelineEyebrow', title: 'landing.clinician.card.timelineTitle', body: 'landing.clinician.card.timelineBody' },
    { eyebrow: 'landing.clinician.card.prescribingEyebrow', title: 'landing.clinician.card.prescribingTitle', body: 'landing.clinician.card.prescribingBody' },
    { eyebrow: 'landing.clinician.card.substitutionEyebrow', title: 'landing.clinician.card.substitutionTitle', body: 'landing.clinician.card.substitutionBody' },
    { eyebrow: 'landing.clinician.card.reviewsEyebrow', title: 'landing.clinician.card.reviewsTitle', body: 'landing.clinician.card.reviewsBody' },
    { eyebrow: 'landing.clinician.card.assistantEyebrow', title: 'landing.clinician.card.assistantTitle', body: 'landing.clinician.card.assistantBody' }
  ];

  const access: { label: MessageKey; on: boolean }[] = [
    { label: 'landing.clinician.access.shared', on: true },
    { label: 'landing.clinician.access.why', on: true },
    { label: 'landing.clinician.access.tracker', on: true },
    { label: 'landing.clinician.access.log', on: true },
    { label: 'landing.clinician.access.noRelationship', on: false },
    { label: 'landing.clinician.access.outsideWindow', on: false },
    { label: 'landing.clinician.access.shop', on: false }
  ];

  const pillars: { title: MessageKey; body: MessageKey }[] = [
    { title: 'landing.plans.pillars.privateTitle', body: 'landing.campus.pillars.privateBody' },
    { title: 'landing.plans.pillars.listedTitle', body: 'landing.plans.pillars.listedBody' },
    { title: 'landing.plans.pillars.nearTitle', body: 'landing.plans.pillars.nearBody' },
    { title: 'landing.plans.pillars.priceTitle', body: 'landing.plans.pillars.priceBody' }
  ];

  const [emergencyBefore, emergencyAfter = ''] = t('landing.campus.footer.emergency').split('{number}');
  const navLink: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '14px', fontWeight: 600, color: 'var(--sk-color-text-2)', textDecoration: 'none' };
  const footerLink: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '14px', fontWeight: 500, color: 'var(--sk-color-sidebar-ink-2)', textDecoration: 'none' };
  const chip: React.CSSProperties = { height: '30px', padding: '0 12px', borderRadius: '999px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--sk-color-info)' };
  const primaryCta: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 30px', borderRadius: '999px', background: 'var(--sk-color-action)', fontSize: '15.5px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* Header */}
      <header style={{ minHeight: '78px', padding: `0 ${PAGE_X}`, display: 'flex', alignItems: 'center', gap: '30px', background: 'var(--sk-color-surface)', borderBottom: '1px solid var(--sk-color-rule-soft)', boxSizing: 'border-box', flexWrap: 'wrap' }}>
        <a href="/landing" aria-label={t('landing.plans.homeLink')} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }} aria-label={t('landing.clinician.navLabel')}>
          <a href="/landing" style={navLink}>{t('landing.campus.nav.forStudents')}</a>
          <a href="/campuses" style={navLink}>{t('landing.campus.nav.forCampuses')}</a>
          <span aria-current="page" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sk-color-action)' }}>{t('landing.campus.nav.forClinicians')}</span>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: 'var(--sk-color-action)', fontSize: '14px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' }}>
          {t('landing.plans.signIn')}
        </a>
      </header>

      {/* Top Graphic Banner */}
      <section aria-label={t('landing.campus.nav.forClinicians')} style={{ flexShrink: 0, position: 'relative', margin: `22px ${PAGE_X} 0`, height: '240px', borderRadius: '28px', background: 'linear-gradient(110deg, var(--sk-color-danger-bg) 0%, var(--sk-color-surface) 45%, var(--sk-color-surface-3) 100%)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '400px', flexShrink: 0, padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-action)' }}>{t('landing.clinician.eyebrow')}</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.7px' }}>{t('landing.clinician.banner.title')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={chip}>{t('landing.clinician.chip.listing')}</span>
            <span style={chip}>{t('landing.clinician.chip.fees')}</span>
            <span style={chip}>{t('landing.clinician.chip.queue')}</span>
          </div>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
          <svg width="680" height="240" viewBox="0 0 820 240" aria-hidden="true" style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}>
            <defs>
              <radialGradient id="bclind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="bclmint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <linearGradient id="bclgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
            </defs>
            <path d="M40 130 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#FECDD3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 130 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#E11D48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <g>
              <path d="M600 40 v50 a50 50 0 0 0 100 0 v-50" fill="none" stroke="url(#bclind)" strokeWidth="10" strokeLinecap="round" />
              <path d="M650 140 v30 a30 30 0 0 0 60 0 v-8" fill="none" stroke="url(#bclind)" strokeWidth="10" strokeLinecap="round" />
              <circle cx="710" cy="152" r="22" fill="url(#bclgold)" />
              <circle cx="710" cy="152" r="11" fill="#FFF3C4" />
            </g>
            <g>
              <rect x="380" y="168" width="60" height="30" rx="10" fill="url(#bclmint)" stroke="#DAE2FD" />
              <text x="410" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">4:30</text>
            </g>
            <g>
              <rect x="450" y="168" width="60" height="30" rx="10" fill="#FFFFFF" stroke="#DAE2FD" />
              <text x="480" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">5:00</text>
            </g>
            <g>
              <rect x="520" y="168" width="60" height="30" rx="10" fill="url(#bclmint)" stroke="#DAE2FD" />
              <text x="550" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">5:30</text>
            </g>
          </svg>
        </div>
      </section>

      {/* Main Hero & Example Triage Queue */}
      <section style={{ padding: `62px ${PAGE_X} 0`, display: 'flex', gap: '56px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.4px' }}>{t('landing.clinician.eyebrow')}</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 56px)', lineHeight: 1.08, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-2px' }}>
            {t('landing.clinician.title')}
          </h1>
          <p style={{ margin: 0, maxWidth: '590px', fontSize: '17px', lineHeight: 1.62, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.clinician.lede')}
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/login" style={primaryCta}>
              {t('landing.clinician.ctaQueue')}
            </a>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 26px', borderRadius: '999px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', fontSize: '15px', fontWeight: 700, color: 'var(--sk-color-text)', textDecoration: 'none' }}>
              {t('landing.clinician.ctaTimeline')}
            </a>
          </div>
        </div>
        <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-text-3)', letterSpacing: '1.2px' }}>{t('landing.clinician.queue.eyebrow')}</span>
          {queue.map((q) => (
            <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '1px solid var(--sk-color-rule-soft)' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, background: FLAG_STYLE[q.flag].bg, color: FLAG_STYLE[q.flag].color }}>
                {q.flag}
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{q.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>{q.meta}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: q.urgent ? 'var(--sk-color-danger)' : 'var(--sk-color-text-3)' }}>
                {q.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Built by Reading What Goes Wrong */}
      <section style={{ padding: `76px ${PAGE_X} 0`, display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.4px' }}>{t('landing.clinician.cards.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.3px' }}>{t('landing.clinician.cards.title')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {cards.map((c) => (
            <div key={c.title} style={{ minHeight: '190px', padding: '26px', borderRadius: '22px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.2px' }}>{t(c.eyebrow)}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.26, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>{t(c.title)}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(c.body)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* The share is the authorisation */}
      <section style={{ margin: `80px ${PAGE_X} 0`, padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'var(--sk-color-brand-navy)', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-2)', letterSpacing: '1.4px' }}>{t('landing.clinician.access.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.14, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-1.1px' }}>{t('landing.clinician.access.title')}</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: 'var(--sk-color-sidebar-ink-3)' }}>
            {t('landing.clinician.access.body')}
          </p>
        </div>
        <ul style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '2px', margin: 0, padding: 0, listStyle: 'none' }}>
          {access.map((a) => (
            <li key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid color-mix(in srgb, var(--sk-color-sidebar-ink) 10%, transparent)' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: a.on ? 'var(--sk-color-positive-fill)' : 'var(--sk-color-danger-fill)' }} />
              <span style={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink)' }}>{t(a.label)}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'color-mix(in srgb, var(--sk-color-sidebar-ink) 12%, transparent)', color: 'var(--sk-color-sidebar-ink)' }}>
                {t(a.on ? 'landing.clinician.access.tagYouSee' : 'landing.clinician.access.tagNever')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Honest Disclosure */}
      <div style={{ margin: `0 ${PAGE_X}`, padding: '24px 30px', borderRadius: '20px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-danger-bg)', display: 'flex', gap: '16px', alignItems: 'flex-start' }} role="note">
        <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--sk-color-danger)' }}>
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('landing.clinician.gap.title')}</span>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>
            <strong>{t('landing.clinician.gap.regTitle')}</strong> {t('landing.clinician.gap.regBody')}
          </p>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>
            <strong>{t('landing.clinician.gap.payTitle')}</strong> {t('landing.clinician.gap.payBody')}
          </p>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--sk-color-text-3)' }}>
            {t('landing.clinician.joining.body')}
          </p>
        </div>
      </div>

      {/* Call to action */}
      <section style={{ margin: `80px ${PAGE_X} 0`, padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'var(--sk-color-surface-3)', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '13px', minWidth: '280px' }}>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.12, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.2px' }}>{t('landing.clinician.cta.title')}</h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.clinician.cta.body')}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-start' }}>
          <a href="/login" style={{ ...primaryCta, padding: '0 34px' }}>
            {t('landing.plans.signIn')}
          </a>
        </div>
      </section>

      {/* Trust Pillars */}
      <section aria-label={t('landing.clinician.pillars.label')} style={{ display: 'flex', gap: '20px', margin: `64px ${PAGE_X} 0`, padding: '40px 24px', borderRadius: '28px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', flexWrap: 'wrap' }}>
        {pillars.map((p) => (
          <div key={p.title} style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t(p.title)}</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(p.body)}</span>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--sk-color-brand-navy)', padding: `52px ${PAGE_X} 36px`, marginTop: '64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-0.4px' }}>
              Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
            </span>
            <span style={{ fontSize: '13px', color: 'var(--sk-color-sidebar-ink-3)', maxWidth: '320px', lineHeight: 1.6 }}>
              {t('landing.campus.footer.tagline')}
            </span>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--sk-color-sidebar-ink-2)' }}>
              {t('landing.campus.footer.building')}
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }} aria-label={t('landing.campus.footer.navLabel')}>
            <a href="/" style={footerLink}>{t('landing.campus.nav.forStudents')}</a>
            <a href="/campuses" style={footerLink}>{t('landing.campus.nav.forCampuses')}</a>
            <a href="/privacy" style={footerLink}>{t('landing.campus.footer.privacy')}</a>
            <a href="/terms" style={footerLink}>{t('landing.campus.footer.terms')}</a>
            <a href="/login" style={footerLink}>{t('landing.plans.signIn')}</a>
          </nav>
        </div>
        <div style={{ borderTop: '1px solid color-mix(in srgb, var(--sk-color-sidebar-ink) 12%, transparent)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--sk-color-sidebar-ink-3)' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ fontSize: '12px', color: 'var(--sk-color-sidebar-ink-2)' }}>{emergencyBefore}<strong style={{ color: 'var(--sk-color-sidebar-ink)' }}>112</strong>{emergencyAfter}</span>
        </div>
      </footer>
    </div>
  );
}
