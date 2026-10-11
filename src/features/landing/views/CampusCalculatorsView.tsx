import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';

const NAV: ReadonlyArray<{ label: MessageKey; href: string; active: boolean }> = [
  { label: 'landing.home.nav.discover', href: '/landing', active: false },
  { label: 'landing.home.nav.training', href: '/wellness', active: false },
  { label: 'landing.home.nav.calculators', href: '/calculators', active: true },
  { label: 'landing.home.nav.labTests', href: '/lab-tests', active: false },
  { label: 'landing.home.nav.findDoctor', href: '/consult', active: false },
];

const navStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none',
  background: active ? 'var(--sk-color-surface-3)' : 'transparent',
  color: active ? 'var(--sk-color-action)' : 'var(--sk-color-text-2)',
  fontWeight: active ? 800 : 600,
});

export function CampusCalculatorsView(): React.ReactElement {
  const t = useT();
  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: 'var(--sk-color-surface)', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--sk-color-rule-soft)', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" aria-label="Studentkare" style={{ minHeight: '44px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label={t('landing.home.navAria')}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={n.active ? 'page' : undefined} style={navStyle(n.active)}>{t(n.label)}</a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '13.5px', fontWeight: 600, color: 'var(--sk-color-text-2)', textDecoration: 'none' }}>{t('landing.home.signIn')}</a>
      </header>

      {/* Hero Headline */}
      <section style={{ padding: '40px clamp(16px, 3.5vw, 44px) 16px', maxWidth: '880px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'var(--sk-color-surface-3)', fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-action)' }}>
            {t('landing.calc.eyebrow')}
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1px' }}>
            {t('landing.calc.title')}
          </h1>
          <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.6, color: 'var(--sk-color-text-2)' }}>
            {t('landing.calc.body')}
          </p>
        </div>

        {/* Live Multi-Tab Calculators Suite */}
        <ComprehensiveHealthCalculators />
      </section>

      {/* Footer Notice */}
      <footer style={{ marginTop: 'auto', padding: '24px clamp(16px, 3.5vw, 44px)', borderTop: '1px solid var(--sk-color-rule-soft)', background: 'var(--sk-color-surface)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--sk-color-text-3)' }}>
          © 2026 Studentkare · {t('landing.calc.footer')}
        </p>
      </footer>
    </div>
  );
}
