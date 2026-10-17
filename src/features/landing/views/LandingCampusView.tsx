import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

/**
 * For campuses (web). No campus statistics are shown: the "24 campuses live",
 * "95.6% attendance", "11 mins" and "86% auto-verified" figures this page used
 * to carry had no source, and cohort reporting does not exist. The illustration
 * keeps its own palette; everything else uses design tokens.
 */
const PAGE_X = 'clamp(16px, 4vw, 64px)';

export function LandingCampusView(): React.ReactElement {
  const t = useT();

  const today: MessageKey[] = ['landing.campus.today.enrolment', 'landing.campus.today.camps', 'landing.campus.today.noRecords'];

  const boundary: { label: MessageKey; on: boolean }[] = [
    { label: 'landing.campus.boundary.enrolment', on: true },
    { label: 'landing.campus.boundary.records', on: false },
    { label: 'landing.campus.boundary.nameDiagnosis', on: false },
    { label: 'landing.campus.boundary.leaving', on: false },
    { label: 'landing.campus.boundary.crisis', on: false }
  ];

  const jobs: { eyebrow: MessageKey; title: MessageKey; body: MessageKey; foot: MessageKey; planned: boolean }[] = [
    { eyebrow: 'landing.campus.jobs.campsEyebrow', title: 'landing.campus.jobs.campsTitle', body: 'landing.campus.jobs.campsBody', foot: 'landing.campus.jobs.campsFoot', planned: false },
    { eyebrow: 'landing.campus.jobs.verifyEyebrow', title: 'landing.campus.jobs.verifyTitle', body: 'landing.campus.jobs.verifyBody', foot: 'landing.campus.jobs.verifyFoot', planned: false },
    { eyebrow: 'landing.campus.jobs.coverageEyebrow', title: 'landing.campus.jobs.coverageTitle', body: 'landing.campus.jobs.coverageBody', foot: 'landing.campus.jobs.coverageFoot', planned: true },
    { eyebrow: 'landing.campus.jobs.governanceEyebrow', title: 'landing.campus.jobs.governanceTitle', body: 'landing.campus.jobs.governanceBody', foot: 'landing.campus.jobs.governanceFoot', planned: false }
  ];

  const compare: { before: MessageKey; after: MessageKey }[] = [
    { before: 'landing.campus.compare.r1Before', after: 'landing.campus.compare.r1After' },
    { before: 'landing.campus.compare.r2Before', after: 'landing.campus.compare.r2After' },
    { before: 'landing.campus.compare.r3Before', after: 'landing.campus.compare.r3After' },
    { before: 'landing.campus.compare.r4Before', after: 'landing.campus.compare.r4After' }
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
  const primaryCta: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 30px', borderRadius: '999px', background: 'var(--sk-color-action)', fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* Top Header */}
      <header style={{ minHeight: '78px', padding: `0 ${PAGE_X}`, display: 'flex', alignItems: 'center', gap: '30px', background: 'var(--sk-color-surface)', borderBottom: '1px solid var(--sk-color-rule-soft)', boxSizing: 'border-box', flexWrap: 'wrap' }}>
        <a href="/landing" aria-label={t('landing.plans.homeLink')} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }} aria-label={t('landing.campus.navLabel')}>
          <a href="/landing" style={navLink}>{t('landing.campus.nav.forStudents')}</a>
          <span aria-current="page" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sk-color-action)' }}>{t('landing.campus.nav.forCampuses')}</span>
          <a href="/clinicians" style={navLink}>{t('landing.campus.nav.forClinicians')}</a>
          <a href="/partnerships" style={navLink}>{t('landing.campus.nav.partnerships')}</a>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/partnerships" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: 'var(--sk-color-action)', fontSize: '14px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' }}>
          {t('landing.campus.enquire')}
        </a>
      </header>

      {/* Top Graphic Banner */}
      <section aria-label={t('landing.campus.nav.forCampuses')} style={{ flexShrink: 0, position: 'relative', margin: `22px ${PAGE_X} 0`, height: '240px', borderRadius: '28px', background: 'linear-gradient(110deg, var(--sk-color-surface-3) 0%, var(--sk-color-surface) 45%, var(--sk-color-positive-bg) 100%)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '400px', flexShrink: 0, padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-action)' }}>{t('landing.campus.bannerEyebrow')}</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.7px' }}>{t('landing.campus.banner.title')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={chip}>{t('landing.campus.chip.camps')}</span>
            <span style={chip}>{t('landing.campus.chip.enrolment')}</span>
            <span style={chip}>{t('landing.campus.chip.oneCamp')}</span>
          </div>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
          <svg width="680" height="240" viewBox="0 0 820 240" aria-hidden="true" style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}>
            <defs>
              <radialGradient id="bcpind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="bcpmint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <linearGradient id="bcpgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
              <radialGradient id="bcppeach" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#FFE0C2" /><stop offset=".6" stopColor="#FDBA74" /><stop offset="1" stopColor="#EA7A2E" /></radialGradient>
            </defs>
            <g>
              <rect x="60" y="60" width="110" height="150" rx="8" fill="url(#bcpind)" />
              <rect x="60" y="60" width="10" height="150" rx="5" fill="#FFFFFF" opacity=".15" />
              <rect x="72" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="101" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="129" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="72" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="101" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="129" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
            </g>
            <g>
              <rect x="180" y="100" width="90" height="110" rx="8" fill="url(#bcpind)" />
              <rect x="192" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
              <rect x="214" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
              <rect x="236" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
            </g>
            <g>
              <rect x="280" y="40" width="130" height="170" rx="8" fill="url(#bcpind)" />
              <rect x="292" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
              <rect x="327" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
              <rect x="362" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
            </g>
            <rect x="40" y="208" width="400" height="10" rx="5" fill="#C7D2FE" />
            <path d="M470 190 C540 120 600 210 680 140 S780 80 800 70" fill="none" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" />
            <g>
              <path d="M470 164c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcpmint)" />
              <circle cx="470" cy="128" r="8" fill="#FFFFFF" />
            </g>
            <g>
              <path d="M680 114c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcppeach)" />
              <circle cx="680" cy="78" r="8" fill="#FFFFFF" />
            </g>
            <g>
              <path d="M790 64c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcpind)" />
              <circle cx="790" cy="28" r="8" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      </section>

      {/* Hero Section */}
      <section style={{ padding: `62px ${PAGE_X} 0`, display: 'flex', gap: '60px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.4px' }}>{t('landing.campus.eyebrow')}</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 56px)', lineHeight: 1.08, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-2px' }}>
            {t('landing.campus.title')}
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '17px', lineHeight: 1.62, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.campus.lede')}
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/login" style={primaryCta}>
              {t('landing.campus.ctaConsole')}
            </a>
            <a href="/campuses#camps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 26px', borderRadius: '999px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', fontSize: '15px', fontWeight: 700, color: 'var(--sk-color-text)', textDecoration: 'none' }}>
              {t('landing.campus.ctaCamp')}
            </a>
          </div>
        </div>
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-text-3)', letterSpacing: '1.2px' }}>{t('landing.campus.today.title')}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {today.map((item) => (
              <li key={item} style={{ padding: '16px 0', borderBottom: '1px solid var(--sk-color-rule-soft)', fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>
                {t(item)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Honest Boundary Box */}
      <section style={{ margin: `76px ${PAGE_X} 0`, padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'var(--sk-color-brand-navy)', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-sidebar-ink-2)', letterSpacing: '1.4px' }}>{t('landing.campus.boundary.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.14, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-1.1px' }}>{t('landing.campus.boundary.title')}</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: 'var(--sk-color-sidebar-ink-3)' }}>
            {t('landing.campus.boundary.body')}
          </p>
        </div>
        <ul style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '2px', margin: 0, padding: 0, listStyle: 'none' }}>
          {boundary.map((b) => (
            <li key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: b.on ? 'var(--sk-color-positive-fill)' : 'var(--sk-color-danger-fill)' }} />
              <span style={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 600, color: 'var(--sk-color-sidebar-ink)' }}>{t(b.label)}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.12)', color: 'var(--sk-color-sidebar-ink)' }}>
                {t(b.on ? 'landing.campus.boundary.canSee' : 'landing.campus.boundary.cannotSee')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Honest Gap Disclosure Notice */}
      <div style={{ margin: `0 ${PAGE_X}`, padding: '24px 30px', borderRadius: '20px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-danger-bg)', display: 'flex', gap: '16px', alignItems: 'flex-start' }} role="note">
        <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--sk-color-danger)' }}>
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('landing.campus.gap.title')}</span>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>
            {t('landing.campus.gap.body')}
          </p>
        </div>
      </div>

      {/* Four Jobs */}
      <section style={{ padding: `80px ${PAGE_X} 0`, display: 'flex', flexDirection: 'column', gap: '30px' }} id="camps">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.4px' }}>{t('landing.campus.jobs.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.3px' }}>{t('landing.campus.jobs.title')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {jobs.map((j) => (
            <div key={j.title} style={{ minHeight: '230px', padding: '26px', borderRadius: '22px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.2px' }}>{t(j.eyebrow)}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.24, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.5px' }}>{t(j.title)}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(j.body)}</span>
              <span style={{ flexGrow: 1 }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: j.planned ? 'var(--sk-color-attention)' : 'var(--sk-color-positive)' }}>{t(j.foot)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Liability Comparison */}
      <section style={{ padding: `80px ${PAGE_X} 0`, display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: '1.4px' }}>{t('landing.campus.liability.eyebrow')}</span>
          <h2 style={{ margin: 0, fontSize: '36px', lineHeight: 1.12, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.2px' }}>{t('landing.campus.liability.title')}</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.campus.liability.body')}
          </p>
        </div>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column' }}>
          {compare.map((c) => (
            <div key={c.before} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', padding: '18px 0', borderBottom: '1px solid var(--sk-color-rule-soft)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-text-3)', letterSpacing: '1px' }}>{t('landing.campus.compare.today')}</span>
                <span style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 600, color: 'var(--sk-color-danger)' }}>{t(c.before)}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--sk-color-positive)', letterSpacing: '1px' }}>{t('landing.campus.compare.with')}</span>
                <span style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 600, color: 'var(--sk-color-text)' }}>{t(c.after)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Start with one camp. The walkthrough button used to go to the sign-in page; the enquiry form is what reaches us. */}
      <section style={{ margin: `80px ${PAGE_X} 0`, padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'var(--sk-color-surface-3)', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }} id="walkthrough">
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '13px', minWidth: '280px' }}>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.12, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.2px' }}>{t('landing.campus.walk.title')}</h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.campus.walk.body')}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-start' }}>
          <a href="/partnerships" style={{ ...primaryCta, padding: '0 34px', fontSize: '15.5px' }}>
            {t('landing.campus.enquire')}
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>{t('landing.campus.walk.note')}</span>
        </div>
      </section>

      {/* Trust Pillars */}
      <section aria-label={t('landing.campus.pillars.label')} style={{ display: 'flex', gap: '20px', margin: `64px ${PAGE_X} 0`, padding: '40px 24px', borderRadius: '28px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', flexWrap: 'wrap' }}>
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
            <a href="/clinicians" style={footerLink}>{t('landing.campus.nav.forClinicians')}</a>
            <a href="/privacy" style={footerLink}>{t('landing.campus.footer.privacy')}</a>
            <a href="/terms" style={footerLink}>{t('landing.campus.footer.terms')}</a>
            <a href="/login" style={footerLink}>{t('landing.plans.signIn')}</a>
          </nav>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--sk-color-sidebar-ink-3)' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ fontSize: '12px', color: 'var(--sk-color-sidebar-ink-2)' }}>{emergencyBefore}<strong style={{ color: 'var(--sk-color-sidebar-ink)' }}>112</strong>{emergencyAfter}</span>
        </div>
      </footer>
    </div>
  );
}
