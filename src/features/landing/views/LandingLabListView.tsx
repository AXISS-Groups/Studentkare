import React, { useState } from 'react';
import './landing.css';

interface LabTestItem {
  name: string;
  pack: string;
  report: string;
  off: string;
  mrp: string;
  price: string;
  fasting: boolean;
  fast24: boolean;
}

export function LandingLabListView(): React.ReactElement {
  const [filterIdx, setFilterIdx] = useState(0);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);

  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/wellness', on: false },
    { label: 'Lab tests', href: '/lab-tests', on: true },
    { label: 'Find a doctor', href: '/consult', on: false },
    { label: 'Programmes', href: '/programs', on: false },
    { label: 'Plans', href: '/plans', on: false }
  ];

  const filterLabels = ['All vitamin tests', 'No fasting needed', 'Report in 24 hrs'];

  const allTests: LabTestItem[] = [
    { name: 'Vitamin D (25-Hydroxy)', pack: '', report: 'Report within 12–20 hours', off: '44% OFF', mrp: '₹899', price: '₹499', fasting: false, fast24: true },
    { name: 'Vitamin B12', pack: '', report: 'Report within 12–20 hours', off: '38% OFF', mrp: '₹649', price: '₹399', fasting: false, fast24: true },
    { name: 'Vitamin D & B12 together', pack: 'Contains 2 tests', report: 'Report within 12–20 hours', off: '46% OFF', mrp: '₹1,299', price: '₹699', fasting: false, fast24: true },
    { name: 'Vitamin Profile', pack: 'Contains 3 tests', report: 'Report within 12–20 hours', off: '30% OFF', mrp: '₹1,699', price: '₹1,189', fasting: false, fast24: true },
    { name: 'Vitamin D Advanced (D2, D3 & total)', pack: 'Contains 3 tests', report: 'Report within 48–72 hours', off: '18% OFF', mrp: '₹1,999', price: '₹1,639', fasting: false, fast24: false },
    { name: 'Vitamin D, B12 & Calcium', pack: 'Contains 3 tests', report: 'Report within 12–20 hours', off: '40% OFF', mrp: '₹1,449', price: '₹869', fasting: true, fast24: true },
    { name: 'Anemia & Iron Deficiency Panel', pack: 'Contains 4 tests', report: 'Report within 24 hours', off: '42% OFF', mrp: '₹1,199', price: '₹699', fasting: true, fast24: true },
    { name: 'Folate (Vitamin B9)', pack: '', report: 'Report within 24–36 hours', off: '25% OFF', mrp: '₹799', price: '₹599', fasting: false, fast24: false }
  ];

  const filteredTests = filterIdx === 0
    ? allTests
    : filterIdx === 1
    ? allTests.filter((t) => !t.fasting)
    : allTests.filter((t) => t.fast24);

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="ltLabList" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#ltLabList)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label="Main Navigation">
          {nav.map((n) => (
            <a
              key={n.label}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '38px',
                padding: '0 14px',
                borderRadius: '11px',
                fontSize: '13.5px',
                textDecoration: 'none',
                ...(n.on ? { background: '#EDEEFB', color: '#3525CD', fontWeight: 800 } : { color: '#464555', fontWeight: 600 })
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>
          Sign in
        </a>
      </header>

      {/* 2. Top Banner with Background Video */}
      <section
        aria-label="Blood tests"
        style={{
          flexShrink: 0,
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
          src="/assets/4486f2e01e220059b969dd4bce96a694.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #06051A 0%, #06051A 30%, rgba(6,5,26,0.55) 52%, rgba(6,5,26,0) 78%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>
            BLOOD TESTS
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.8px' }}>
            Every value, explained.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Fasting guide
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Home collection
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Trend over time
            </span>
          </div>
        </div>
      </section>

      {/* 3. Search & Location Bar */}
      <div style={{ padding: '20px clamp(16px, 3.5vw, 44px) 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '11px', height: '52px', padding: '0 18px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-5.2 7-10.5A7 7 0 0 0 5 10.5C5 15.8 12 21 12 21z" />
            <circle cx="12" cy="10" r="2.4" />
          </svg>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>VNR VJIET · Block B</span>
          <span style={{ width: '1px', height: '22px', background: '#EEF2FF' }} />
          <span style={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 500, color: '#6B6980' }}>Search tests or full-body checkups</span>
        </div>
      </div>

      {/* 4. Breadcrumb Navigation */}
      <div style={{ padding: '18px clamp(16px, 3.5vw, 44px) 0', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <a href="/landing" style={{ fontSize: '12.5px', fontWeight: 600, color: '#6B6980', textDecoration: 'none' }}>Home</a>
        <span style={{ fontSize: '12.5px', color: '#C7C4D8' }}>›</span>
        <a href="/lab-tests" style={{ fontSize: '12.5px', fontWeight: 600, color: '#6B6980', textDecoration: 'none' }}>Lab tests</a>
        <span style={{ fontSize: '12.5px', color: '#C7C4D8' }}>›</span>
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#131B2E' }}>Vitamin tests</span>
      </div>

      {/* 5. Heading and Filter Pills */}
      <div style={{ padding: '14px clamp(16px, 3.5vw, 44px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px' }}>
            Vitamin tests at VNR VJIET
          </h1>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>
            {filteredTests.length} of {allTests.length} tests · collected at Block B, analysed by NABL labs
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filterLabels.map((lbl, idx) => (
            <button
              key={lbl}
              type="button"
              aria-label={`Filter: ${lbl}`}
              onClick={() => setFilterIdx(idx)}
              style={{
                height: '44px',
                minHeight: '44px',
                padding: '0 18px',
                borderRadius: '11px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                transition: 'background 0.2s ease, color 0.2s ease',
                background: idx === filterIdx ? '#3525CD' : '#FFFFFF',
                color: idx === filterIdx ? '#FFFFFF' : '#464555',
                fontWeight: idx === filterIdx ? 800 : 600,
                boxShadow: idx === filterIdx ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Tests Grid */}
      <div style={{ padding: '20px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        {filteredTests.map((t) => (
          <div
            key={t.name}
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: '#FFFFFF',
              border: '1px solid #EEF2FF',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '236px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#EDEBFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C6BA8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z" />
                </svg>
              </span>
              <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#ECFDF5', fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>
                {t.off}
              </span>
            </div>

            <span style={{ fontSize: '16px', lineHeight: 1.24, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.35px' }}>
              {t.name}
            </span>

            {t.pack && (
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#3525CD' }}>
                {t.pack}
              </span>
            )}

            <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>
              {t.report}
            </span>

            <span style={{ fontSize: '11.5px', fontWeight: 800, color: t.fasting ? '#D97706' : '#059669' }}>
              {t.fasting ? 'Needs 10 hrs fasting' : 'No fasting needed'}
            </span>

            <span style={{ flexGrow: 1 }} />

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '11px', borderTop: '1px solid #EEF2FF' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B6980', textDecoration: 'line-through' }}>
                  {t.mrp}
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.price}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Book slot for ${t.name}`}
                onClick={() => setBookedSlot(t.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '44px',
                  minHeight: '44px',
                  padding: '0 20px',
                  borderRadius: '11px',
                  background: bookedSlot === t.name ? '#059669' : '#3525CD',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {bookedSlot === t.name ? 'Booked ✓' : 'Book slot'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 7. Clinical Disclaimer */}
      <div style={{ padding: '20px clamp(16px, 3.5vw, 44px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-5M12 8h.01" />
        </svg>
        <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>
          Ask a clinician which test is appropriate before booking. Prices are for campus collection at Block B and include the phlebotomist visit.
        </span>
      </div>

      {/* 8. Trust Pillars */}
      <section
        aria-label="Why students trust Student Kare"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '40px clamp(16px, 4vw, 72px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Private by default</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Records open only to you and the clinician you choose. Your campus sees counts, never results.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Verified clinicians</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every doctor is NMC-registered and every lab NABL-accredited before they can list.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Near your hostel</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Collection at your block, consults between classes, a campus clinic when it is open.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Price before you book</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every price is on screen before you confirm. A plan changes the price, never the care.
          </span>
        </div>
      </section>

      {/* 9. Newsletter & Footer */}
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 4vw, 72px)', marginTop: '40px' }}>
        <section
          aria-label="Subscribe to campus health updates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            padding: '40px clamp(16px, 3.5vw, 44px)',
            transform: 'translateY(-1px)',
            borderRadius: '0 0 28px 28px',
            background: 'linear-gradient(120deg, #3525CD 0%, #4F46E5 55%, #6366F1 100%)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>THE KARE LETTER · TWICE A MONTH</span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>Camp dates, seasonal alerts and plain-language health tips.</span>
          </div>
          <div style={{ flex: '1 1 420px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Subscribe by" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button type="button" role="radio" aria-checked={nlTab === 'wa'} aria-label="Subscribe via WhatsApp" onClick={() => setNlTab('wa')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '44px', minHeight: '44px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'wa' ? '#FFFFFF' : 'transparent', color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF' }}>WhatsApp</button>
              <button type="button" role="radio" aria-checked={nlTab === 'em'} aria-label="Subscribe via Email" onClick={() => setNlTab('em')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '44px', minHeight: '44px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'em' ? '#FFFFFF' : 'transparent', color: nlTab === 'em' ? '#3525CD' : '#E0E7FF' }}>Email</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (nlInput.trim()) setNlSubscribed(true); }} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" aria-label="Contact input" placeholder={nlTab === 'wa' ? '+91 WhatsApp Number' : 'you@college.edu.in'} value={nlInput} onChange={(e) => setNlInput(e.target.value)} style={{ flexGrow: 1, minWidth: '200px', height: '54px', padding: '0 16px', borderRadius: '14px', border: 0, outline: 'none', background: '#FFFFFF', fontSize: '15px', color: '#131B2E' }} />
              <button type="submit" style={{ height: '54px', padding: '0 26px', borderRadius: '14px', border: 0, background: '#131B2E', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', cursor: 'pointer' }}>{nlSubscribed ? 'Subscribed!' : 'Subscribe'}</button>
            </form>
          </div>
        </section>

        {/* Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF' }}>Student Kare</span>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: '#A5B4FC' }}>A health record you own, from campus to career.</span>
          </div>
          <nav aria-label="Student Kare Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>STUDENT KARE</span>
            <a href="/campuses" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>About us</a>
            <a href="/plans" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>How we make money</a>
            <a href="/partnerships" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Careers</a>
          </nav>
          <nav aria-label="For Students Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/consult" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/wellness" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Wellness training</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid #2E2A66', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#A5B4FC' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: '#E0E7FF', textDecoration: 'none' }}>
            Crisis line: <span style={{ fontWeight: 800, color: '#FCA5A5' }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800, color: '#FCA5A5' }}>14416</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
