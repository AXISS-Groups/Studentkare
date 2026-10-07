import React from 'react';
import './landing.css';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';

export function CampusCalculatorsView(): React.ReactElement {
  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="ltCalc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#ltCalc)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label="Main Navigation">
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none', color: '#464555', fontWeight: 600 }}>Discover</a>
          <a href="/wellness" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none', color: '#464555', fontWeight: 600 }}>Training</a>
          <a href="/calculators" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none', background: '#EDEEFB', color: '#3525CD', fontWeight: 800 }}>Health Calculators</a>
          <a href="/lab-tests" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none', color: '#464555', fontWeight: 600 }}>Lab tests</a>
          <a href="/consult" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', textDecoration: 'none', color: '#464555', fontWeight: 600 }}>Find a doctor</a>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>Sign in</a>
      </header>

      {/* Hero Headline */}
      <section style={{ padding: '40px clamp(16px, 3.5vw, 44px) 16px', maxWidth: '880px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', height: '28px', padding: '0 12px', borderRadius: '999px', background: '#EEF2FF', fontSize: '12px', fontWeight: 800, color: '#3525CD' }}>
            CLINICAL EVIDENCE TOOLS · ICMR STANDARDS
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.15, fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
            Campus Clinical & Health Metrics Calculators
          </h1>
          <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.6, color: '#464555' }}>
            Evidence-based clinical anthropometrics and recovery indices for Indian campus populations.
            No gamification, zero peer ranking, and strict Rule L privacy protection.
          </p>
        </div>

        {/* Live Multi-Tab Calculators Suite */}
        <ComprehensiveHealthCalculators />
      </section>

      {/* Footer Notice */}
      <footer style={{ marginTop: 'auto', padding: '24px clamp(16px, 3.5vw, 44px)', borderTop: '1px solid #EEF2FF', background: '#FFFFFF', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#6B6980' }}>
          © 2026 Studentkare · Medical reference guidelines sourced from ICMR, WHO Asia-Pacific, and AHA consensus tables.
        </p>
      </footer>
    </div>
  );
}
