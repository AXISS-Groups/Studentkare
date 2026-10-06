import React, { useState } from 'react';
import './landing.css';

export function LandingConsultView(): React.ReactElement {
  // Interactive newsletter / subscribe dispatch tab
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  // Interactive FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // SVGs
  const clock = 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';
  const rx = 'M7 20V8h4a3 3 0 0 1 0 6H7m6 0 5 6M14 15l4-4';
  const lock = 'M5 11h14v9H5zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11';
  const stetho = 'M6 4v6a6 6 0 0 0 12 0V4';
  const brain = 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1';
  const spark = 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z';
  const drop = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const body = 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 9h8l-1 5-1 7h-2l-1-5-1 5H8l-1-7z';

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/programs', on: false },
    { label: 'Lab tests', href: '/lab-tests', on: false },
    { label: 'Find a doctor', href: '/consult', on: true },
    { label: 'Programmes', href: '/programs', on: false },
    { label: 'Plans', href: '/plans', on: false }
  ];

  const promises = [
    { label: 'Usually seen within 30 minutes', path: clock, ink: '#4F46E5', tint: '#EEF2FF' },
    { label: 'A valid, signed prescription', path: rx, ink: '#059669', tint: '#ECFDF5' },
    { label: 'Your college is never told', path: lock, ink: '#7C6BA8', tint: '#EDEBFA' }
  ];

  const docs = [
    { initials: 'AR', name: 'Dr. Ananya Reddy', spec: 'MD Internal Medicine · NMC-TS-88412', when: '4:30 PM' },
    { initials: 'SR', name: 'Dr. Sneha Reddy', spec: 'Adolescent psychiatry · NMC-TS-71029', when: '6:00 PM' },
    { initials: 'KM', name: 'Dr. Kavya Menon', spec: 'Gynaecology · NMC-TS-51170', when: 'Thu 11:00' }
  ];

  const specs = [
    { label: 'General medicine', fee: '₹199', note: '₹149 on Premium', path: stetho, ink: '#4F46E5', tint: '#EEF2FF' },
    { label: 'Fever & infections', fee: '₹199', note: '₹149 on Premium', path: drop, ink: '#C4756B', tint: '#FBEAE2' },
    { label: 'Report follow-up', fee: '₹199', note: 'Free if we ran the test', path: rx, ink: '#4F46E5', tint: '#EEF2FF' },
    { label: 'Mental health', fee: '₹249', note: 'Crisis support is always free', path: brain, ink: '#7C6BA8', tint: '#EDEBFA' },
    { label: 'Skin & hair', fee: '₹299', note: '₹229 on Premium', path: spark, ink: '#B08968', tint: '#F8F0E9' },
    { label: "Women's health", fee: '₹349', note: '₹269 on Premium', path: body, ink: '#5E8F73', tint: '#E6F0EA' }
  ];

  const rules = [
    { label: 'The specific records you shared, for the days you set', tag: 'YES', on: true },
    { label: 'A note written back into your vault after the consult', tag: 'YES', on: true },
    { label: 'Your whole vault, because they are a doctor', tag: 'NEVER', on: false },
    { label: 'Anything after the share expires', tag: 'NEVER', on: false },
    { label: 'What you bought, browsed or asked Ayush', tag: 'NEVER', on: false }
  ];

  const faqs = [
    {
      q: 'What does my Edu ID actually get me?',
      a: 'A free account — your health record, the offline emergency card, and crisis support, none of which we charge for. Consults are paid per use, from ₹199, with the price and any plan discount shown before you pick a slot. You never reach a payment screen you did not expect.'
    },
    {
      q: 'Will I get a prescription I can actually use?',
      a: 'Yes. Every doctor on Studentkare is verified against the National Medical Commission (NMC) register and signs digitally. Prescriptions carry the doctor’s registration number and council name, making them valid at any licensed campus or retail pharmacy across India.'
    },
    {
      q: 'Can I see the same doctor again?',
      a: 'Yes. When booking a follow-up or report review, you can view your previous doctor’s upcoming shift slots. If they are off-shift and your condition is urgent, you have the option to be seen by the on-duty clinician immediately.'
    },
    {
      q: 'What if I need to cancel?',
      a: 'You can cancel or reschedule without penalty up to 30 minutes before your slot begins. If you cancel, the full fee is refunded directly to your original payment method or wallet.'
    },
    {
      q: 'Is a consult private from my college?',
      a: 'Entirely private. Under Rule L and Studentkare’s campus firewall, your institution is never notified that you booked a consultation, nor do they ever have access to medical notes, diagnoses, or prescriptions.'
    },
    {
      q: 'What if it is an emergency?',
      a: 'Studentkare is an outpatient teleconsultation and clinic booking service, not an emergency department. In an acute, life-threatening crisis, tap the red SOS button for emergency protocols or call 112 / Tele-MANAS 14416 immediately.'
    }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F6F7FC', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="cnA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#cnA)" />
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
                ...(n.on
                  ? { background: '#EDEEFB', color: '#3525CD', fontWeight: 800 }
                  : { color: '#464555', fontWeight: 600 })
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

      {/* 2. Top Banner */}
      <section
        aria-label="Consult a doctor"
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '240px',
          borderRadius: '28px',
          background: 'linear-gradient(110deg, #EEF2FF 0%, #FFFFFF 45%, #FFF1F2 100%)',
          border: '1px solid #EEF2FF',
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
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>
            CONSULT A DOCTOR
          </span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>
            Talk within 30 minutes, prescription in your vault.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>
              Video or chat
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>
              From ₹199
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>
              NMC-registered
            </span>
          </div>
        </div>

        {/* Video consult simulation SVG */}
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'flex-end', minWidth: '300px' }}>
          <svg width="100%" height="200" viewBox="0 0 480 200" fill="none" style={{ maxWidth: '480px' }} aria-hidden="true">
            <rect x="20" y="20" width="280" height="160" rx="16" fill="#1E1B4B" />
            <circle cx="160" cy="85" r="32" fill="#FDBA74" />
            <path d="M120 160c4-28 20-40 40-40s36 12 40 40z" fill="#FFFFFF" />
            <rect x="36" y="36" width="56" height="22" rx="11" fill="#E11D48" />
            <text x="50" y="51" fill="#FFFFFF" fontSize="10" fontWeight="800">LIVE</text>
            <rect x="320" y="40" width="140" height="34" rx="12" fill="#FFFFFF" stroke="#EEF2FF" />
            <text x="332" y="61" fill="#131B2E" fontSize="11" fontWeight="700">Fever since last night</text>
            <rect x="300" y="85" width="160" height="34" rx="12" fill="#4F46E5" />
            <text x="312" y="106" fill="#FFFFFF" fontSize="11" fontWeight="700">Let’s check your throat…</text>
            <rect x="320" y="130" width="140" height="34" rx="12" fill="#ECFDF5" />
            <text x="332" y="151" fill="#047857" fontSize="11" fontWeight="700">e-Rx sent to vault</text>
          </svg>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.7px' }}>
            Talk to an NMC-registered doctor. From ₹199, priced before you book.
          </h1>
          <p style={{ margin: 0, maxWidth: '560px', fontSize: '17px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Your Edu ID gets you the free account and the record. The consult itself is paid — you see the price, and any plan discount, before you pick a slot.
          </p>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {promises.map((p) => (
              <span key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.tint, color: p.ink }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.path} />
                  </svg>
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{p.label}</span>
              </span>
            ))}
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
              background: '#3525CD',
              fontSize: '15.5px',
              fontWeight: 800,
              color: '#FFFFFF',
              textDecoration: 'none'
            }}
          >
            See who is on shift now →
          </a>
        </div>

        {/* Doctor Shift Preview Card */}
        <div style={{ flex: '1 1 380px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
          <img
            src="/assets/46011255169a19dbc1060f1bd00e5fd4.png"
            alt="Doctor On Shift"
            style={{ alignSelf: 'center', height: '180px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.2px' }}>
            ON SHIFT RIGHT NOW
          </span>
          {docs.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 800, color: '#3525CD', flexShrink: 0 }}>
                {d.initials}
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>{d.name}</span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: '#059669' }} />
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>{d.spec}</span>
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#047857' }}>{d.when}</span>
            </div>
          ))}
          <span style={{ fontSize: '11.5px', lineHeight: 1.55, fontWeight: 500, color: '#6B6980' }}>
            Ordered by availability and distance. Never by who pays us.
          </span>
        </div>
      </section>

      {/* 4. Specialities Grid */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          What students come in with.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {specs.map((s) => (
            <a
              key={s.label}
              href="/appointments"
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '11px',
                textDecoration: 'none',
                border: '1px solid #EEF2FF'
              }}
            >
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.tint }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </span>
              <span style={{ fontSize: '14px', lineHeight: 1.3, fontWeight: 700, color: '#131B2E' }}>{s.label}</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{s.fee}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B6980' }}>{s.note}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 5. What the Doctor Can See (Boundary & Consent) */}
      <section
        style={{
          margin: '46px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(24px, 3.5vw, 44px) clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 60%, #17144C 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.3px' }}>
            WHAT THE DOCTOR CAN SEE
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 31px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
            Only what you share, for as long as you choose.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Booking a consult does not open your vault. You pick the records, you pick the number of days, and it lapses on its own.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {rules.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                padding: '13px 0',
                borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>
                {r.label}
              </span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  ...(r.on
                    ? { background: 'rgba(130,245,193,0.16)', color: '#82F5C1' }
                    : { background: 'rgba(248,113,113,0.16)', color: '#FCA5A5' })
                }}
              >
                {r.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Questions Students Actually Ask (Accordion) */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Before you book.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={f.q}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 0',
                  borderBottom: '1px solid #DAE2FD',
                  cursor: 'pointer'
                }}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenFaq(isOpen ? null : idx);
                  }
                }}
                aria-expanded={isOpen}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#131B2E' }}>
                    {f.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#777587"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      marginTop: '3px'
                    }}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {isOpen ? (
                  <p style={{ margin: '10px 0 0', maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                    {f.a}
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
          background: '#EDEEFB',
          display: 'flex',
          alignItems: 'center',
          gap: '46px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>
            FOR CLINICIANS
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.14, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>
            Are you an NMC-registered doctor?
          </h2>
          <p style={{ margin: 0, maxWidth: '620px', fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Take campus clinic sessions on a queue sorted by severity, with consent-scoped access and a note that writes itself into the student's vault. Verification is against the register, not a form.
          </p>
        </div>
        <img
          src="/assets/b859fcf30b096631cfd1de1b6c0b839f.png"
          alt="Clinician Consultation"
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
            background: '#3525CD',
            fontSize: '15px',
            fontWeight: 800,
            color: '#FFFFFF',
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          Apply to practise →
        </a>
      </section>

      {/* 8. Trust Pillars */}
      <section
        aria-label="Why students trust Student Kare"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 3.5vw, 44px) 0',
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

      {/* 9. Get the App Banner */}
      <section
        aria-label="Get the Student Kare app"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          margin: '40px clamp(16px, 3.5vw, 44px) 64px',
          padding: '0 0 0 clamp(24px, 4vw, 56px)',
          minHeight: '420px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #DAE2FD 100%)',
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>
            GET THE APP
          </span>
          <span style={{ fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px', maxWidth: '520px' }}>
            Your records, your camp slots and your card — in your pocket.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '184px',
                  height: '54px',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  background: '#131B2E',
                  color: '#FFFFFF',
                  textDecoration: 'none'
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>Download on the</span>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>App Store</span>
                </span>
              </a>
              <a
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '184px',
                  height: '54px',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  background: '#131B2E',
                  color: '#FFFFFF',
                  textDecoration: 'none'
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>GET IT ON</span>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>Google Play</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer with Newsletter Subscription */}
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 3.5vw, 44px)' }}>
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
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>
              THE KARE LETTER · TWICE A MONTH
            </span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>
              Camp dates, seasonal alerts and plain-language health tips.
            </span>
          </div>

          <div style={{ flex: '1 1 420px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Subscribe by" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button
                type="button"
                role="radio"
                aria-checked={nlTab === 'wa'}
                onClick={() => setNlTab('wa')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: nlTab === 'wa' ? '#FFFFFF' : 'transparent',
                  color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF'
                }}
              >
                WhatsApp
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={nlTab === 'em'}
                onClick={() => setNlTab('em')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: nlTab === 'em' ? '#FFFFFF' : 'transparent',
                  color: nlTab === 'em' ? '#3525CD' : '#E0E7FF'
                }}
              >
                Email
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nlInput.trim()) {
                  setNlSubscribed(true);
                }
              }}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              <input
                type="text"
                aria-label="Contact input"
                placeholder={nlTab === 'wa' ? '+91 WhatsApp Number' : 'you@college.edu.in'}
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                style={{ flexGrow: 1, minWidth: '200px', height: '54px', padding: '0 16px', borderRadius: '14px', border: 0, outline: 'none', background: '#FFFFFF', fontSize: '15px', color: '#131B2E' }}
              />
              <button
                type="submit"
                style={{
                  height: '54px',
                  padding: '0 26px',
                  borderRadius: '14px',
                  border: 0,
                  background: '#131B2E',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                {nlSubscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
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
            <a href="/help" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Contact us</a>
          </nav>
          <nav aria-label="For Students Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/consult" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/vault" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Health vault</a>
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
