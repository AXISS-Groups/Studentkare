import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

type NavId = 'discover' | 'wellness' | 'training' | 'labTests' | 'findDoctor' | 'programmes' | 'plans';

const NAV: ReadonlyArray<{ id: NavId; href: string }> = [
  { id: 'discover', href: '/landing' },
  { id: 'wellness', href: '/shop' },
  { id: 'training', href: '/wellness' },
  { id: 'labTests', href: '/lab-tests' },
  { id: 'findDoctor', href: '/consult' },
  { id: 'programmes', href: '/programs' },
  { id: 'plans', href: '/plans' }
];

/** Top bar shared by the programmes, wellness and lab-list pages. */
export function SubpageHeader({ current }: { current: NavId }): React.ReactElement {
  const t = useT();
  return (
    <header style={{ minHeight: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: 'var(--sk-color-surface)', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--sk-color-rule-soft)', flexWrap: 'wrap', boxSizing: 'border-box' }}>
      <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', textDecoration: 'none' }}>
        <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
        </span>
        <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
          Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
        </span>
      </a>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label={t('landing.subpage.navLabel')}>
        {NAV.map((n) => {
          const on = n.id === current;
          return (
            <a
              key={n.id}
              href={n.href}
              aria-current={on ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: '44px',
                padding: '0 14px',
                borderRadius: '11px',
                fontSize: '13.5px',
                textDecoration: 'none',
                ...(on ? { background: 'var(--sk-color-surface-3)', color: 'var(--sk-color-action)', fontWeight: 800 } : { color: 'var(--sk-color-text-2)', fontWeight: 600 })
              }}
            >
              {t(`landing.subpage.nav.${n.id}` as MessageKey)}
            </a>
          );
        })}
      </nav>
      <span style={{ flexGrow: 1 }} />
      <a href="/login" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '13.5px', fontWeight: 600, color: 'var(--sk-color-text-2)', textDecoration: 'none' }}>
        {t('landing.subpage.signIn')}
      </a>
    </header>
  );
}

const PILLARS = ['private', 'listed', 'near', 'price'] as const;

/** The four promises at the foot of the programmes, wellness and lab-list pages. */
export function TrustPillars({ marginTop }: { marginTop: string }): React.ReactElement {
  const t = useT();
  return (
    <section
      aria-label={t('landing.subpage.trust.label')}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        margin: `${marginTop} clamp(16px, 4vw, 72px) 0`,
        padding: '40px 24px',
        borderRadius: '28px',
        background: 'var(--sk-color-surface)',
        border: '1px solid var(--sk-color-rule-soft)'
      }}
    >
      {PILLARS.map((id) => (
        <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>{t(`landing.subpage.trust.${id}Title` as MessageKey)}</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)', maxWidth: '260px' }}>
            {t(`landing.subpage.trust.${id}Body` as MessageKey)}
          </span>
        </div>
      ))}
    </section>
  );
}

const footerLink: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '14px', color: 'var(--sk-color-sidebar-ink-2)', textDecoration: 'none' };

/**
 * Footer shared by the programmes, wellness and lab-list pages. The updates
 * band used to take a phone number or email and answer "Subscribed!" without
 * sending it anywhere; there is no sign-up service, so it now says so.
 */
export function SubpageFooter(): React.ReactElement {
  const t = useT();
  return (
    <footer style={{ background: 'var(--sk-color-brand-navy)', padding: '0 clamp(16px, 4vw, 72px)', marginTop: '40px' }}>
      <section
        aria-label={t('landing.subpage.updates.label')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          padding: '40px clamp(16px, 3.5vw, 44px)',
          borderRadius: '0 0 28px 28px',
          background: 'linear-gradient(120deg, var(--sk-color-action) 0%, var(--sk-color-focus) 100%)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-sidebar-ink-2)' }}>{t('landing.subpage.updates.eyebrow')}</span>
          <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: 'var(--sk-color-on-action)', letterSpacing: '-0.6px' }}>{t('landing.subpage.updates.title')}</span>
        </div>
        <p style={{ flex: '1 1 320px', maxWidth: '600px', margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 600, color: 'var(--sk-color-on-action)' }}>
          {t('landing.subpage.updates.notYet')}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink)' }}>Student Kare</span>
          <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--sk-color-sidebar-ink-2)' }}>{t('landing.subpage.footer.tagline')}</span>
        </div>
        <nav aria-label={t('landing.subpage.footer.companyLabel')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-3)' }}>{t('landing.subpage.footer.company')}</span>
          <a href="/campuses" style={footerLink}>{t('landing.subpage.footer.about')}</a>
          <a href="/plans" style={footerLink}>{t('landing.subpage.footer.money')}</a>
          <a href="/partnerships" style={footerLink}>{t('landing.subpage.footer.partnerships')}</a>
        </nav>
        <nav aria-label={t('landing.subpage.footer.studentsLabel')} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-3)' }}>{t('landing.subpage.footer.students')}</span>
          <a href="/lab-tests" style={footerLink}>{t('landing.subpage.footer.bookLab')}</a>
          <a href="/consult" style={footerLink}>{t('landing.subpage.footer.consult')}</a>
          <a href="/wellness" style={footerLink}>{t('landing.subpage.footer.wellness')}</a>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid var(--sk-color-sidebar)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink-3)' }}>© 2026 AVKS AI · studentkare.co</span>
        <span style={{ flexGrow: 1 }} />
        <a href="/crisis" style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '44px', fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink-2)', textDecoration: 'none' }}>
          {t('landing.subpage.footer.crisisLine')} <span style={{ fontWeight: 800, color: 'var(--sk-color-sidebar-ink)' }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800, color: 'var(--sk-color-sidebar-ink)' }}>14416</span>
        </a>
      </div>
    </footer>
  );
}

const PROGRAMMES = [
  { id: 'diabetes', ill: '/assets/ccaceb013b98b55746bb521aa288e5f7.png' },
  { id: 'asthma', ill: '/assets/e4c5353d2e08a21d6945c5c9c6406165.png' },
  { id: 'mental', ill: '/assets/350fa7fe80e771c5429756e6751432ff.png' },
  { id: 'pcos', ill: '/assets/aa86cceef7f47ddd0066a108e627ed0b.png' }
] as const;

const INCLUDES = [1, 2, 3, 4, 5] as const;
const STEPS = [1, 2, 3, 4] as const;
const RULES = [
  { n: 1, on: true },
  { n: 2, on: true },
  { n: 3, on: true },
  { n: 4, on: false },
  { n: 5, on: false },
  { n: 6, on: false }
] as const;
const FAQS = [1, 2, 3, 4, 5] as const;

/**
 * Care programmes. There is no self-enrolment endpoint — a clinician enrols a
 * student — so the per-programme "Join" no longer turns into "Enrolled ✓"
 * locally; it leads to a consult. The DPDP "strict confidentiality" claim is
 * replaced by what the product actually does.
 */
export function LandingProgramsView(): React.ReactElement {
  const t = useT();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      <SubpageHeader current="programmes" />

      {/* Top banner with background video */}
      <section
        aria-label={t('landing.programs.bannerLabel')}
        style={{
          flexShrink: 0,
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          height: '240px',
          borderRadius: '28px',
          background: 'var(--sk-color-brand-navy)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <video
          src="/assets/2c18e6c6648794dd62440d6720ffc956.mp4"
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
            background: 'linear-gradient(90deg, var(--sk-color-brand-navy) 0%, var(--sk-color-brand-navy) 32%, rgba(30,27,75,0.58) 54%, rgba(30,27,75,0) 80%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-sidebar-ink-2)' }}>
            {t('landing.programs.eyebrow')}
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-0.8px' }}>
            {t('landing.programs.bannerTitle')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            {(['landing.programs.chipClinician', 'landing.programs.chipCheckins', 'landing.programs.chipNoScores'] as const).map((key) => (
              <span key={key} style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--sk-color-sidebar-ink-2)' }}>
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Intro */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '690px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.3px' }}>
            {t('landing.programs.introEyebrow')}
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 45px)', lineHeight: 1.12, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.7px' }}>
            {t('landing.programs.title')}
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '17px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.programs.intro')}
          </p>
          <a
            href="/consult"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', minHeight: '54px', padding: '0 28px', borderRadius: '13px', background: 'var(--sk-color-action)', fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' }}
          >
            {t('landing.programs.cta')}
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--sk-color-text-3)', lineHeight: 1.5 }}>
            {t('landing.programs.ctaNote')}
          </span>
        </div>

        <div style={{ flex: '1 1 360px', padding: '26px', borderRadius: '22px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-text-3)', letterSpacing: '1.2px' }}>
            {t('landing.programs.includesTitle')}
          </span>
          {INCLUDES.map((n) => (
            <span key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--sk-color-rule-soft)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sk-color-positive)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
              <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t(`landing.programs.include${n}Title` as MessageKey)}</span>
                <span style={{ fontSize: '11.5px', lineHeight: 1.45, fontWeight: 500, color: 'var(--sk-color-text-3)' }}>{t(`landing.programs.include${n}Body` as MessageKey)}</span>
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* The four programmes */}
      <section style={{ padding: '48px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1px' }}>
            {t('landing.programs.listTitle')}
          </h2>
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t('landing.programs.listNote')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {PROGRAMMES.map((p) => {
            const name = t(`landing.programs.prog.${p.id}.name` as MessageKey);
            return (
              <div
                key={p.id}
                style={{ padding: '24px', borderRadius: '20px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '340px' }}
              >
                <img src={p.ill} alt="" aria-hidden="true" style={{ height: '140px', width: 'auto', alignSelf: 'center', objectFit: 'contain' }} />
                <span style={{ fontSize: '18px', lineHeight: 1.24, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
                  {name}
                </span>
                <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t(`landing.programs.prog.${p.id}.body` as MessageKey)}
                </span>
                <span style={{ flexGrow: 1 }} />
                <ul style={{ listStyle: 'none', margin: 0, padding: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '7px', borderTop: '1px solid var(--sk-color-rule-soft)' }}>
                  {[1, 2, 3].map((n) => (
                    <li key={n} style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--sk-color-text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span aria-hidden="true" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--sk-color-action)' }} />
                      {t(`landing.programs.prog.${p.id}.p${n}` as MessageKey)}
                    </li>
                  ))}
                </ul>
                <a
                  href="/consult"
                  aria-label={t('landing.programs.askAria', { name })}
                  style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', borderRadius: '11px', background: 'var(--sk-color-surface-3)', fontSize: '12.5px', fontWeight: 800, color: 'var(--sk-color-action)', textDecoration: 'none' }}
                >
                  {t('landing.programs.ask')}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* How a programme runs */}
      <section style={{ margin: '48px clamp(16px, 3.5vw, 44px) 0', padding: '36px', borderRadius: '24px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1px' }}>
          {t('landing.programs.stepsTitle')}
        </h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '22px' }}>
          {STEPS.map((n) => (
            <li key={n} style={{ display: 'flex', flexDirection: 'column', gap: '11px', paddingTop: '18px', borderTop: '3px solid var(--sk-color-action)' }}>
              <span aria-hidden="true" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1px' }}>{`0${n}`}</span>
              <span style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>{t(`landing.programs.step${n}Title` as MessageKey)}</span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(`landing.programs.step${n}Body` as MessageKey)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Structure, not surveillance */}
      <section
        style={{
          margin: '40px clamp(16px, 3.5vw, 44px) 0',
          padding: '44px clamp(20px, 4vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, var(--sk-color-info) 0%, var(--sk-color-brand-navy) 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-2)', letterSpacing: '1.3px' }}>
            {t('landing.programs.notEyebrow')}
          </span>
          <h2 style={{ margin: 0, fontSize: '31px', lineHeight: 1.14, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-1px' }}>
            {t('landing.programs.notTitle')}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: 'var(--sk-color-sidebar-ink-3)' }}>
            {t('landing.programs.notBody')}
          </p>
        </div>
        <ul style={{ flex: '1 1 380px', listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {RULES.map((r) => (
            <li key={r.n} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? 'var(--sk-color-positive-fill)' : 'var(--sk-color-danger-fill)' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink)' }}>{t(`landing.programs.rule${r.n}` as MessageKey)}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: 'rgba(255,255,255,0.12)', color: 'var(--sk-color-sidebar-ink)' }}>
                {r.on ? t('landing.programs.tagYes') : t('landing.programs.tagNever')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQs */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1px' }}>
          {t('landing.programs.faqTitle')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((n, idx) => {
            const isOpen = openFaq === idx;
            const panelId = `programs-faq-${n}`;
            return (
              <div key={n} style={{ borderBottom: '1px solid var(--sk-color-rule)' }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '20px 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <span style={{ flexGrow: 1, fontSize: '16px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t(`landing.programs.faq${n}Q` as MessageKey)}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sk-color-text-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: '3px', transition: 'transform 0.2s ease' }} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen ? (
                  <p id={panelId} style={{ margin: '0 0 20px', maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                    {t(`landing.programs.faq${n}A` as MessageKey)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <TrustPillars marginTop="64px" />
      <SubpageFooter />
    </div>
  );
}
