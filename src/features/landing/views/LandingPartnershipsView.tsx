import React, { useState } from 'react';
import './landing.css';

export function LandingPartnershipsView(): React.ReactElement {
  const [cat, setCat] = useState(0);
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const [formOrg, setFormOrg] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formReach, setFormReach] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSent, setFormSent] = useState(false);

  const creds = [
    { label: 'What we verify *', value: 'AICTE / UGC affiliation and a named administrator', hard: false },
    { label: 'Drug licence number *', value: 'Checked against the state licensing authority — blocking', hard: true },
    { label: 'NABL certificate number *', value: 'Checked against NABL — blocking, no exceptions', hard: true },
    { label: 'NMC registration of the lead clinician *', value: 'Checked against the NMC register — blocking', hard: true },
    { label: 'What we verify *', value: 'Registration, plus a written no-clinical-claims undertaking', hard: false }
  ];

  const campus = 'M3 10l9-5 9 5-9 5zM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5';
  const pill = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const flask = 'M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z';
  const stetho = 'M6 4v6a6 6 0 0 0 12 0V4';
  const run = 'M3 12h4l2-6 3 12 2-6h7';

  const categories = ['Campus', 'Pharmacy', 'Diagnostic lab', 'Clinic or hospital', 'Fitness & wellbeing'];

  const stats = [
    { value: '24', label: 'Campuses live, Telangana and Delhi' },
    { value: '18,420', label: 'Verified students on the platform' },
    { value: '0', label: 'Sponsored slots sold, since launch' },
    { value: '1 term', label: 'Minimum pilot, then you decide' }
  ];

  const partners = [
    { name: 'Campuses', body: 'Run camps, verify enrolment, see coverage. You never become the data fiduciary for a student record.',
      gate: 'Aggregate only, suppressed under 20', path: campus, ink: '#4F46E5', tint: '#EEF2FF' },
    { name: 'Pharmacies', body: 'Dispense to blocks with a named pharmacist signing every substitution.',
      gate: 'Valid drug licence, pharmacist on duty', path: pill, ink: '#5E8F73', tint: '#E6F0EA' },
    { name: 'Diagnostic labs', body: 'Campus collection, tracked cold chain, results straight into the student vault.',
      gate: 'NABL accreditation, no exceptions', path: flask, ink: '#7C6BA8', tint: '#EDEBFA' },
    { name: 'Clinics & hospitals', body: 'Take campus sessions and referrals with consent-scoped access to records.',
      gate: 'NMC-registered clinicians only', path: stetho, ink: '#B08968', tint: '#F8F0E9' },
    { name: 'Fitness & wellbeing', body: 'Movement listings with sources shown. Guides, not prescriptions.',
      gate: 'No clinical claims, ever', path: run, ink: '#C4756B', tint: '#FBEAE2' }
  ];

  const firewall = [
    { label: 'A paid slot at the top of a listing', tag: 'NOT SOLD', on: false },
    { label: 'Targeting by a student’s conditions or results', tag: 'NOT SOLD', on: false },
    { label: 'Browsing or purchase data about students', tag: 'NOT SOLD', on: false },
    { label: 'Exclusivity that removes a student’s choice', tag: 'NOT SOLD', on: false },
    { label: 'Ranking earned on stock, distance and turnaround', tag: 'HOW IT WORKS', on: true },
    { label: 'Your service metrics, shown to you and to students', tag: 'HOW IT WORKS', on: true }
  ];

  const steps = [
    { n: '01', title: 'Apply', body: 'Tell us the category, the campuses you can reach and your licence details.', tag: 'SAME WEEK', ok: true },
    { n: '02', title: 'Credentials checked', body: 'Drug licence, NABL certificate or NMC registration, against the issuing body.', tag: 'BLOCKING', ok: false },
    { n: '03', title: 'Catalogue published', body: 'Your listings go in with source labels. You set price and stock; you cannot set position.', tag: '3–5 DAYS', ok: true },
    { n: '04', title: 'One-term pilot', body: 'A single campus. Real orders, real turnaround, measured the way students see it.', tag: 'ONE TERM', ok: true },
    { n: '05', title: 'Widen or stop', body: 'Both of us look at the same numbers. No lock-in clause makes that decision for you.', tag: 'YOUR CALL', ok: true }
  ];

  const logos = ['CAMPUS 01', 'CAMPUS 02', 'CAMPUS 03', 'PHARMACY 01', 'LAB 01', 'LAB 02',
    'CLINIC 01', 'CAMPUS 04', 'PHARMACY 02', 'LAB 03', 'CLINIC 02', 'FITNESS 01'];

  const letter = [
    'Studentkare was built on a refusal: we will not sell placement, we will not rank by commission, and we will not expose student health events to commercial targeting.',
    'Refusing sponsored placement makes revenue harder and pitches slower. We chose that tradeoff deliberately because a patient in pain or distress cannot distinguish an earned recommendation from an ad, and a regulated health record makes that ambiguity unacceptable.',
    'Serve one campus with us for one term. Let the measured turnaround, fill rate, and clinical feedback decide whether we expand together. That is the whole partnership proposition.'
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#F6F7FC', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="ptA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#ptA)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label="Main Navigation">
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For students</a>
          <a href="/campuses" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For campuses</a>
          <a href="/clinicians" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For clinicians</a>
          <span style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', background: '#EDEEFB', fontSize: '13.5px', fontWeight: 800, color: '#3525CD' }}>Partnerships</span>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="#apply" style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 20px', borderRadius: '11px', background: '#3525CD', fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Apply to join
        </a>
      </header>

      {/* 2. Top Banner */}
      <section
        aria-label="Partnerships"
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '240px',
          borderRadius: '28px',
          background: 'linear-gradient(110deg, #EEF2FF 0%, #FFFFFF 45%, #FFF7ED 100%)',
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
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>PARTNERSHIPS</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>One network: campus, labs, clinics, pharmacies.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Free listing</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Commission published</span>
          </div>
        </div>

        {/* Network diagram SVG */}
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'flex-end', minWidth: '300px' }}>
          <svg width="100%" height="200" viewBox="0 0 520 200" fill="none" style={{ maxWidth: '520px' }} aria-hidden="true">
            <circle cx="260" cy="100" r="38" fill="#4F46E5" />
            <text x="260" y="106" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800">SK</text>
            <circle cx="100" cy="50" r="22" fill="#8B93FF" />
            <text x="100" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">Campus</text>
            <circle cx="120" cy="150" r="22" fill="#10B981" />
            <text x="120" y="155" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">Labs</text>
            <circle cx="420" cy="50" r="22" fill="#F59E0B" />
            <text x="420" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">Clinics</text>
            <circle cx="400" cy="150" r="22" fill="#EC4899" />
            <text x="400" y="155" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">Pharmacy</text>
            <line x1="260" y1="100" x2="100" y2="50" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="260" y1="100" x2="120" y2="150" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="260" y1="100" x2="420" y2="50" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="260" y1="100" x2="400" y2="150" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '48px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>PARTNERSHIPS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.7px' }}>
            Reach students without buying your way to the top.
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '17px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            There are no sponsored slots to sell. Listings rank on stock, distance and turnaround, so the way to get seen is to serve a campus well. That is the whole commercial model, stated plainly.
          </p>
        </div>
        <div style={{ flex: '1 1 340px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: '22px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '5px', border: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              <span style={{ fontSize: '12.5px', lineHeight: 1.4, fontWeight: 600, color: '#464555' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Who We Work With */}
      <section style={{ padding: '48px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Who we work with.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          {partners.map((p) => (
            <div key={p.name} style={{ padding: '24px', borderRadius: '20px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '11px', minHeight: '306px', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
              <span style={{ width: '46px', height: '46px', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.tint }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={p.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={p.path} />
                </svg>
              </span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>{p.name}</span>
              <span style={{ fontSize: '12.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{p.body}</span>
              <span style={{ flexGrow: 1 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px', borderTop: '1px solid #EEF2FF' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#6B6980', letterSpacing: '1px' }}>NON-NEGOTIABLE</span>
                <span style={{ fontSize: '11.5px', lineHeight: 1.45, fontWeight: 700, color: '#E11D48' }}>{p.gate}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. What You Cannot Buy (Firewall) */}
      <section
        style={{
          margin: '48px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(24px, 3.5vw, 44px) clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 60%, #17144C 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.3px' }}>WHAT YOU CANNOT BUY HERE</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 31px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>The firewall applies to partners too.</h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>Read this before you apply. If your model needs targeting or placement, we are the wrong platform and we would rather say so now than after a contract.</p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {firewall.map((f, i) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: i < firewall.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: f.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{f.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: f.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: f.on ? '#82F5C1' : '#FCA5A5' }}>{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Onboarding Steps */}
      <section style={{ margin: '44px clamp(16px, 3.5vw, 44px) 0', padding: '36px', borderRadius: '24px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid #EEF2FF' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Onboarding, end to end.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '18px', borderTop: '3px solid #4F46E5' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1px' }}>{s.n}</span>
              <span style={{ fontSize: '15.5px', lineHeight: 1.25, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{s.title}</span>
              <span style={{ fontSize: '12.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{s.body}</span>
              <span style={{ alignSelf: 'flex-start', padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.4px', background: s.ok ? '#ECFDF5' : '#FFE4E6', color: s.ok ? '#047857' : '#E11D48' }}>{s.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Partner Directory */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Who is already on.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {logos.map((l) => (
            <div key={l} style={{ height: '76px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#464555', letterSpacing: '0.5px' }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Founder Note */}
      <section style={{ margin: '46px clamp(16px, 3.5vw, 44px) 0', padding: '40px clamp(20px, 3.5vw, 44px)', borderRadius: '24px', background: '#FFFFFF', display: 'flex', gap: '44px', flexWrap: 'wrap', border: '1px solid #EEF2FF' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>A NOTE FROM THE FOUNDER</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 28px)', lineHeight: 1.18, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px' }}>Why we build it this way</h2>
          {letter.map((p, idx) => (
            <p key={idx} style={{ margin: 0, maxWidth: '820px', fontSize: '14.5px', lineHeight: 1.7, fontWeight: 500, color: '#464555' }}>{p}</p>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#131B2E' }}>Krishna Chintakayala</span>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>Founder, Student Kare · AXISS Group</span>
          </div>
        </div>
      </section>

      {/* 9. Qualification Form */}
      <section id="apply" style={{ margin: '44px clamp(16px, 3.5vw, 44px) 0', padding: '40px clamp(20px, 3.5vw, 44px)', borderRadius: '24px', background: '#FFFFFF', display: 'flex', gap: '50px', flexWrap: 'wrap', border: '1px solid #EEF2FF' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', lineHeight: 1.14, fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Tell us what you can serve.</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>Four fields. We reply within a week either way — including when the answer is no, and why.</p>
          <span style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: 600, color: '#6B6980' }}>* marks a required field</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormSent(true);
          }}
          style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>Organisation name *</label>
              <input required value={formOrg} onChange={(e) => setFormOrg(e.target.value)} placeholder="Registered name, as on licence" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', background: '#FAFAFE', border: '1px solid #DAE2FD', fontSize: '13.5px', color: '#131B2E' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>Work email *</label>
              <input required type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="name@organisation.in" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', background: '#FAFAFE', border: '1px solid #DAE2FD', fontSize: '13.5px', color: '#131B2E' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>Campuses you can reach *</label>
              <input required value={formReach} onChange={(e) => setFormReach(e.target.value)} placeholder="Names, or districts covered" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', background: '#FAFAFE', border: '1px solid #DAE2FD', fontSize: '13.5px', color: '#131B2E' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>Contact number *</label>
              <input required value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 99999 99999" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', background: '#FAFAFE', border: '1px solid #DAE2FD', fontSize: '13.5px', color: '#131B2E' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>Category *</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
              {categories.map((c, i) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCat(i)}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '11px',
                    border: 0,
                    cursor: 'pointer',
                    fontSize: '13px',
                    ...(i === cat ? { background: '#3525CD', color: '#FFFFFF', fontWeight: 800 } : { background: '#FAFAFE', border: '1px solid #DAE2FD', color: '#464555', fontWeight: 600 })
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#464555' }}>{creds[cat].label}</span>
            <span style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, ...(creds[cat].hard ? { background: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239' } : { background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }) }}>
              {creds[cat].value}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '4px', flexWrap: 'wrap' }}>
            <button type="submit" style={{ display: 'flex', alignItems: 'center', height: '50px', padding: '0 28px', borderRadius: '12px', background: '#3525CD', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', border: 0, cursor: 'pointer' }}>
              {formSent ? 'Application Sent!' : 'Send application'}
            </button>
            <span style={{ fontSize: '11.5px', lineHeight: 1.5, fontWeight: 500, color: '#6B6980' }}>
              We do not sell or share the details you send here. This form is not a contract.
            </span>
          </div>
        </form>
      </section>

      {/* 10. Footer with Newsletter Subscription */}
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 3.5vw, 44px)', marginTop: '40px' }}>
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
              <button type="button" role="radio" aria-checked={nlTab === 'wa'} onClick={() => setNlTab('wa')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'wa' ? '#FFFFFF' : 'transparent', color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF' }}>WhatsApp</button>
              <button type="button" role="radio" aria-checked={nlTab === 'em'} onClick={() => setNlTab('em')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'em' ? '#FFFFFF' : 'transparent', color: nlTab === 'em' ? '#3525CD' : '#E0E7FF' }}>Email</button>
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
          <nav aria-label="For Partners Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR PARTNERS</span>
            <a href="/campuses" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Bring it to your campus</a>
            <a href="/clinicians" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Join as a clinician</a>
            <a href="/partnerships" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>List a lab or pharmacy</a>
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
