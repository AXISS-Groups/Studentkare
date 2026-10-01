import React, { useState } from 'react';
import './landing.css';

export function LandingClinicianView(): React.ReactElement {
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const flags = {
    HH: { bg: '#FFE4E6', color: '#E11D48' },
    LL: { bg: '#FFE4E6', color: '#E11D48' },
    H: { bg: '#FFFBEB', color: '#B45309' },
    N: { bg: '#ECFDF5', color: '#047857' }
  };

  const queue = [
    { flag: 'HH' as const, name: 'Potassium 6.8 mmol/L', meta: 'Released 11 min ago · not acknowledged', value: 'ref 3.5–5.1', urgent: true },
    { flag: 'LL' as const, name: 'Haemoglobin 7.1 g/dL', meta: 'Released 38 min ago · not acknowledged', value: 'ref 12.0–15.5', urgent: true },
    { flag: 'H' as const, name: 'TSH 9.4 mIU/L', meta: 'Acknowledged 2 hrs ago', value: 'ref 0.4–4.0', urgent: false },
    { flag: 'N' as const, name: 'Complete Blood Count', meta: 'All 21 parameters in range', value: 'no action', urgent: false }
  ];

  const cards = [
    { eyebrow: 'CRITICAL RESULTS', title: 'Acknowledgement is measured, not assumed', body: 'Release starts a clock. Your median turnaround is on your own dashboard, and an unacknowledged critical value sits above every revenue metric on the platform.' },
    { eyebrow: 'ONE TIMELINE', title: 'Readings, prescriptions and notes on one axis', body: 'Not four tabs. Anything outside the consent window is absent rather than greyed out, so you are never guessing whether you are missing something.' },
    { eyebrow: 'PRESCRIBING', title: 'An allergy check that says what it checked', body: 'It blocks on a name match and tells you so — cross-reactivity is not checked, so a related beta-lactam would pass. A green tick that overstates verification is worse than none.' },
    { eyebrow: 'SUBSTITUTION', title: 'Permitting a swap is not performing one', body: 'You mark what you allow. A named pharmacist still signs off every substitution, and the register keeps both entries.' },
    { eyebrow: 'REPORT REVIEWS', title: 'Closed when the student has read it', body: 'A review is not done when you write it. The fourth stage of the tracker is read-by-student, because that is the step that usually goes unmeasured.' },
    { eyebrow: 'THE AGENT', title: 'It refuses rather than guessing', body: 'Ayush answers students from approved sources only. It will not diagnose, prescribe or read a vault, and it routes anything clinical to you.' }
  ];

  const access = [
    { label: 'Records a student has shared with you', tag: 'YOU SEE', on: true },
    { label: 'Why each record is readable, and until when', tag: 'YOU SEE', on: true },
    { label: 'Your own access log, the same one the student sees', tag: 'YOU SEE', on: true },
    { label: 'Students with no care relationship to you', tag: 'NEVER', on: false },
    { label: 'Anything outside the consent window', tag: 'NEVER', on: false },
    { label: 'What a student bought or browsed', tag: 'NEVER', on: false }
  ];

  const gates = [
    { n: '01', title: 'Identity', body: 'Government ID matched to your application.', tag: 'SAME DAY', ok: true },
    { n: '02', title: 'NMC registration', body: 'Your number checked against the register. Granting is blocked until this clears.', tag: 'BLOCKING', ok: false },
    { n: '03', title: 'Institution', body: 'A campus confirms the attachment. Necessary, not sufficient.', tag: '1–2 DAYS', ok: true },
    { n: '04', title: 'Scope acknowledged', body: 'Consent-scoped access, time-boxed, fully logged. You sign that you understand it.', tag: 'ONE PAGE', ok: true }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '78px', padding: '0 clamp(16px, 4vw, 64px)', display: 'flex', alignItems: 'center', gap: '30px', background: '#FAF8FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="dg1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#dg1)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '26px', flexWrap: 'wrap' }} aria-label="Main Navigation">
          <a href="/landing" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For students</a>
          <a href="/campuses" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For campuses</a>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>For clinicians</span>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/clinicians" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: '#4F46E5', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Apply to practise
        </a>
      </header>

      {/* 2. Top Banner */}
      <section
        aria-label="For clinicians"
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 4vw, 64px) 0',
          minHeight: '240px',
          borderRadius: '28px',
          background: 'linear-gradient(110deg, #FFF1F2 0%, #FFFFFF 45%, #EEF2FF 100%)',
          border: '1px solid #EEF2FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
          padding: '24px clamp(20px, 3.5vw, 40px)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>FOR CLINICIANS</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Your slots, your patients, 90% of every fee.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Free listing</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Published commission</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>NMC-verified</span>
          </div>
        </div>

        {/* Dynamic Graphic */}
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'flex-end', minWidth: '300px' }}>
          <svg width="100%" height="200" viewBox="0 0 520 200" fill="none" style={{ maxWidth: '520px' }} aria-hidden="true">
            <rect x="20" y="30" width="160" height="60" rx="16" fill="#FFFFFF" stroke="#DAE2FD" />
            <text x="40" y="58" fontFamily="monospace" fontSize="22" fontWeight="700" fill="#047857">90%</text>
            <text x="40" y="76" fontSize="11" fontWeight="700" fill="#464555">of every consult is yours</text>
            <rect x="200" y="30" width="70" height="34" rx="10" fill="#ECFDF5" stroke="#DAE2FD" />
            <text x="235" y="52" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill="#047857">4:30 PM</text>
            <rect x="280" y="30" width="70" height="34" rx="10" fill="#FFFFFF" stroke="#DAE2FD" />
            <text x="315" y="52" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill="#131B2E">5:00 PM</text>
            <rect x="360" y="30" width="70" height="34" rx="10" fill="#ECFDF5" stroke="#DAE2FD" />
            <text x="395" y="52" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill="#047857">5:30 PM</text>
            <path d="M40 140 h140 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h160" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '62px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '56px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>FOR NMC-REGISTERED CLINICIANS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 58px)', lineHeight: 1.06, fontWeight: 800, color: '#131B2E', letterSpacing: '-2.1px' }}>
            A queue sorted by severity, not by arrival.
          </h1>
          <p style={{ margin: 0, maxWidth: '590px', fontSize: '18px', lineHeight: 1.62, fontWeight: 500, color: '#464555' }}>
            A potassium of 6.8 does not sit behind forty routine results. You see what needs you first, with the reference range beside the value and the consent that makes it readable stated on the row.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/clinicians" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', padding: '0 30px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See the clinical queue
            </a>
            <a href="/consult" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', padding: '0 26px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #DAE2FD', fontSize: '15px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
              See a patient timeline
            </a>
          </div>
        </div>

        {/* Live Clinical Queue Preview */}
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '36px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.2px' }}>YOUR QUEUE, RIGHT NOW</span>
          {queue.map((q) => (
            <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, background: flags[q.flag].bg, color: flags[q.flag].color }}>
                {q.flag}
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{q.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B6980' }}>{q.meta}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: q.urgent ? '#E11D48' : '#777587' }}>
                {q.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. What Is Different */}
      <section style={{ padding: '76px clamp(16px, 4vw, 64px) 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHAT IS DIFFERENT</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Built by reading what goes wrong.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {cards.map((c) => (
            <div key={c.title} style={{ minHeight: '210px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '11px', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{c.eyebrow}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.26, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>{c.title}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>{c.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Access and Limits */}
      <section
        style={{
          margin: '80px clamp(16px, 4vw, 64px) 0',
          padding: '52px clamp(20px, 4vw, 58px)',
          borderRadius: '30px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #17144C 100%)',
          display: 'flex',
          gap: '56px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 380px', maxWidth: '470px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.4px' }}>YOUR ACCESS, AND ITS LIMITS</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.1px' }}>
            The share is the authorisation. Not your role.
          </h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Being a clinician here does not open anyone's record. A student shares specific documents for a number of days they choose. You see exactly those, and every open is written to a ledger neither of us can delete.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {access.map((a, i) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: i < access.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: a.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{a.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: a.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: a.on ? '#82F5C1' : '#FCA5A5' }}>
                {a.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Joining Gates */}
      <section style={{ padding: '80px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>JOINING</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 38px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>Verified against the NMC register, not a form.</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#464555' }}>
            Your registration number is checked against the register before the role is granted, and it is printed on every prescription you issue here. A campus admin confirming you is not enough on its own.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {gates.map((g) => (
            <div key={g.n} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5', width: '28px', flexShrink: 0 }}>{g.n}</span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{g.title}</span>
                <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{g.body}</span>
              </div>
              <span style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.4px', flexShrink: 0, background: g.ok ? '#ECFDF5' : '#FFE4E6', color: g.ok ? '#047857' : '#E11D48' }}>
                {g.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Take One Clinic Session Callout */}
      <section
        style={{
          margin: '80px clamp(16px, 4vw, 64px) 0',
          padding: '0 clamp(20px, 4vw, 58px) 0 clamp(20px, 3vw, 36px)',
          borderRadius: '30px',
          background: '#EEF2FF',
          display: 'flex',
          alignItems: 'center',
          gap: '48px',
          flexWrap: 'wrap'
        }}
      >
        <img
          src="/assets/b859fcf30b096631cfd1de1b6c0b839f.png"
          alt="Campus Session"
          style={{ height: '320px', width: 'auto', margin: '30px 0 -50px', flexShrink: 0, objectFit: 'contain' }}
        />
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '13px', padding: '24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>
            Take one campus clinic session.
          </h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Work a single shift and judge it on the queue, the note and the time it takes to close a critical result. That is the whole pitch.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-end', padding: '24px 0' }}>
          <a
            href="/clinicians"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '58px',
              padding: '0 34px',
              borderRadius: '999px',
              background: '#4F46E5',
              fontSize: '16px',
              fontWeight: 800,
              color: '#FFFFFF',
              textDecoration: 'none'
            }}
          >
            Apply to practise
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>Reg. number · one verification call</span>
        </div>
      </section>

      {/* 8. Trust Pillars */}
      <section
        aria-label="Why students trust Student Kare"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 4vw, 72px) 0',
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
          margin: '40px clamp(16px, 4vw, 72px) 64px',
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
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 4vw, 72px)' }}>
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
          <nav aria-label="For Clinicians Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR CLINICIANS</span>
            <a href="/clinicians" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Clinical queue</a>
            <a href="/consult" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/privacy" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Privacy policy</a>
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
