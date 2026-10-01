import React, { useState } from 'react';
import './landing.css';

interface Program {
  name: string;
  body: string;
  points: string[];
  ink: string;
  tint: string;
  ill: string;
}

export function LandingProgramsView(): React.ReactElement {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [enrolledProg, setEnrolledProg] = useState<string | null>(null);

  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/wellness', on: false },
    { label: 'Lab tests', href: '/lab-tests', on: false },
    { label: 'Find a doctor', href: '/consult', on: false },
    { label: 'Programmes', href: '/programs', on: true },
    { label: 'Plans', href: '/plans', on: false }
  ];

  const includes = [
    { title: 'One clinician who keeps the thread', meta: 'Not whoever is free. They see your history, so you stop re-explaining it.' },
    { title: 'Refills timed to your course', meta: 'Worked out from when it was issued and how long it runs — no reminder to set.' },
    { title: 'Tests scheduled, not remembered', meta: 'A repeat panel appears in Preventive care when it is due.' },
    { title: 'A dose schedule that records misses', meta: 'Kept for your clinician to see. Not scored, not reported to anyone.' },
    { title: 'Somewhere to go at 2 AM', meta: 'Crisis and campus health desk, one tap from anywhere in the app.' }
  ];

  const programmes: Program[] = [
    {
      name: 'Diabetes',
      body: 'Type 1 and type 2, including the hostel problems — fridge access, missed meals, exam-week highs.',
      points: ['HbA1c every 3 months', 'Insulin or oral refills', 'Hypo plan on your emergency card'],
      ink: '#4F46E5',
      tint: '#EEF2FF',
      ill: '/assets/ccaceb013b98b55746bb521aa288e5f7.png'
    },
    {
      name: 'Asthma & allergy',
      body: 'Inhaler technique, triggers in shared rooms, and a plan for when it gets worse at night.',
      points: ['Inhaler refills tracked', 'Peak-flow logging', 'Written action plan'],
      ink: '#5E8F73',
      tint: '#E6F0EA',
      ill: '/assets/e4c5353d2e08a21d6945c5c9c6406165.png'
    },
    {
      name: 'Mental health',
      body: 'Counselling continuity with the same person, and medication review if you are on any.',
      points: ['Same counsellor each time', 'Crisis line always one tap', 'Never on any campus report'],
      ink: '#7C6BA8',
      tint: '#EDEBFA',
      ill: '/assets/350fa7fe80e771c5429756e6751432ff.png'
    },
    {
      name: 'PCOS & thyroid',
      body: 'Cycles, weight, and the panels that actually need repeating — without a four-hour trip home.',
      points: ['Repeat panels scheduled', 'Gynaecology on campus', 'Symptom notes you control'],
      ink: '#B08968',
      tint: '#F8F0E9',
      ill: '/assets/aa86cceef7f47ddd0066a108e627ed0b.png'
    }
  ];

  const steps = [
    { n: '01', title: 'You enrol', body: 'Pick a programme and a clinician. Nothing is shared until you choose what to share.' },
    { n: '02', title: 'A baseline is set', body: 'Existing reports, current medicines, what has been tried. Usually one consult.' },
    { n: '03', title: 'It runs quietly', body: 'Refills and repeat tests appear when due. You act on them or you do not.' },
    { n: '04', title: 'You leave when you want', body: 'Standing consent ends the day you end it. Everything stored stays yours and exportable.' }
  ];

  const rules = [
    { label: 'A clinician who knows your history', tag: 'YES', on: true },
    { label: 'Refills and repeat tests timed for you', tag: 'YES', on: true },
    { label: 'Standing consent you can revoke any day', tag: 'YES', on: true },
    { label: 'Your campus told you are enrolled', tag: 'NEVER', on: false },
    { label: 'Adherence scored, ranked or streaked', tag: 'NEVER', on: false },
    { label: 'A risk score predicting your outcome', tag: 'NEVER', on: false }
  ];

  const faqs = [
    {
      q: 'I already have a doctor at home. Does this replace them?',
      a: 'No, and it should not. A programme keeps things steady during term — refills, repeat panels, someone to call. Your treating doctor stays the treating doctor, and you can share everything recorded here with them in one tap.'
    },
    {
      q: 'What does it cost?',
      a: 'Enrolling in a programme is free. Consultations, prescribed refills, and laboratory tests scheduled inside a programme are priced per use at standard student rates. There are no lock-in fees or penalties for missed appointments.'
    },
    {
      q: 'Can I stay enrolled over the holidays?',
      a: 'Yes. Teleconsultations and pan-India digital prescriptions continue seamlessly throughout vacation periods, and diagnostic panels can be booked near your home address.'
    },
    {
      q: 'What happens to my records if I leave?',
      a: 'Your standing consent revokes immediately upon exit. Your clinical records remain entirely yours, stored in your personal vault and fully exportable in open FHIR R4 standard formats.'
    },
    {
      q: 'Will my parents be told?',
      a: 'If you are 18 or older, Studentkare maintains strict confidentiality under the DPDP Act. Your medical records, diagnoses, and prescriptions are never disclosed to campus authorities or parents without your explicit consent.'
    }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="ltProg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#ltProg)" />
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
        aria-label="Care programmes"
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
          src="/assets/2c18e6c6648794dd62440d6720ffc956.mp4"
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
            background: 'linear-gradient(90deg, #06051A 0%, #06051A 32%, rgba(6,5,26,0.58) 54%, rgba(6,5,26,0) 80%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>
            CARE PROGRAMMES
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.8px' }}>
            Small steps, kept.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Clinician-led
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Weekly check-ins
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              No body-metric scores
            </span>
          </div>
        </div>
      </section>

      {/* 3. Hero Intro Grid */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '690px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>
            ONGOING CARE
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 45px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.7px' }}>
            Managing something long-term, away from home.
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '17px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            A hostel is a hard place to keep a condition steady — no fridge for insulin, no one noticing a missed dose, a specialist four hours away. A programme keeps the same clinician, the refills and the follow-up in one thread.
          </p>
          <a
            href="/consult"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              height: '54px',
              padding: '0 28px',
              borderRadius: '13px',
              background: '#3525CD',
              fontSize: '15px',
              fontWeight: 800,
              color: '#FFFFFF',
              textDecoration: 'none'
            }}
          >
            Join a programme →
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980', lineHeight: 1.5 }}>
            Enrolment is free. Consults and tests inside a programme are priced per use. Leave whenever you like — your records stay yours.
          </span>
        </div>

        <div style={{ flex: '1 1 360px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.2px' }}>
            WHAT A PROGRAMME INCLUDES
          </span>
          {includes.map((inc) => (
            <span key={inc.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 0', borderBottom: '1px solid #EEF2FF' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
              <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{inc.title}</span>
                <span style={{ fontSize: '11.5px', lineHeight: 1.45, fontWeight: 500, color: '#6B6980' }}>{inc.meta}</span>
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* 4. Four Programmes Cards */}
      <section style={{ padding: '48px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Four programmes, open now.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {programmes.map((p) => (
            <div
              key={p.name}
              style={{
                padding: '24px',
                borderRadius: '20px',
                background: '#FFFFFF',
                border: '1px solid #EEF2FF',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '340px'
              }}
            >
              <img
                src={p.ill}
                alt=""
                style={{ height: '140px', width: 'auto', alignSelf: 'center', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '18px', lineHeight: 1.24, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
                {p.name}
              </span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                {p.body}
              </span>
              <span style={{ flexGrow: 1 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingTop: '12px', borderTop: '1px solid #EEF2FF' }}>
                {p.points.map((pt) => (
                  <span key={pt} style={{ fontSize: '11.5px', fontWeight: 600, color: '#464555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: p.ink }} />
                    {pt}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEnrolledProg(p.name)}
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '42px',
                  borderRadius: '11px',
                  background: enrolledProg === p.name ? '#059669' : '#EDEEFB',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: enrolledProg === p.name ? '#FFFFFF' : '#3525CD',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {enrolledProg === p.name ? 'Enrolled ✓' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. How a Programme Runs */}
      <section style={{ margin: '48px clamp(16px, 3.5vw, 44px) 0', padding: '36px', borderRadius: '24px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          How a programme runs.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '22px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: '11px', paddingTop: '18px', borderTop: '3px solid #4F46E5' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1px' }}>{s.n}</span>
              <span style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{s.title}</span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{s.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Structure, Not Surveillance Banner */}
      <section
        style={{
          margin: '40px clamp(16px, 3.5vw, 44px) 0',
          padding: '44px clamp(20px, 4vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 60%, #17144C 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.3px' }}>
            WHAT A PROGRAMME IS NOT
          </span>
          <h2 style={{ margin: 0, fontSize: '31px', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
            Structure, not surveillance.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Enrolling gives a named clinician a standing consent you can revoke. It does not hand anyone a live feed of your day.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {rules.map((r) => (
            <span key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{r.label}</span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  background: r.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)',
                  color: r.on ? '#82F5C1' : '#FCA5A5'
                }}
              >
                {r.tag}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* 7. FAQs */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Before you enrol.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={f.q}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  padding: '20px 0',
                  borderBottom: '1px solid #DAE2FD',
                  cursor: 'pointer'
                }}
              >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#131B2E' }}>{f.q}</span>
                  {isOpen && (
                    <span style={{ maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                      {f.a}
                    </span>
                  )}
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#777587"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: '3px', transition: 'transform 0.2s ease' }}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            );
          })}
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
