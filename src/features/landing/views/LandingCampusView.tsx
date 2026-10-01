import React, { useState } from 'react';
import './landing.css';

export function LandingCampusView(): React.ReactElement {
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const stats = [
    { value: '24', label: 'Campuses live across Telangana and Delhi' },
    { value: '95.6%', label: 'Attendance at the last annual health check' },
    { value: '0', label: 'Student names ever exposed to a campus dashboard' },
    { value: '11 mins', label: 'Median time from critical result to clinician acknowledgement' }
  ];

  const boundary = [
    { label: 'How many students attended the camp', tag: 'YOU SEE', on: true },
    { label: 'Coverage by block, year and department', tag: 'YOU SEE', on: true },
    { label: 'Which categories were suppressed this month', tag: 'YOU SEE', on: true },
    { label: 'Any individual student’s records', tag: 'NEVER', on: false },
    { label: 'A name against a diagnosis or a finding', tag: 'NEVER', on: false },
    { label: 'Mental health or sexual health, at any cohort size', tag: 'NEVER', on: false },
    { label: 'Crisis line volume, even in aggregate', tag: 'NEVER', on: false }
  ];

  const jobs = [
    { eyebrow: 'CAMPS', title: 'Run a health camp end to end', body: 'Create it, staff it, invite the cohort, watch the queue on the day, file the report. Attendance is opt-in and a no-show is not reported to you.', foot: 'Replaces the spreadsheet' },
    { eyebrow: 'VERIFICATION', title: 'Confirm enrolment, nothing more', body: 'Most students clear automatically against your directory. Your team only sees the ones that do not, and answers one question: is this person enrolled here.', foot: '86% auto-verified' },
    { eyebrow: 'COVERAGE', title: 'See where clinical cover is thin', body: 'Clinician availability per block against the redundancy minimum, so a gap is visible before a student finds it at 2 AM.', foot: 'Minimum 2 per cluster' },
    { eyebrow: 'COMPLIANCE', title: 'Evidence when someone asks', body: 'Suppression counts, consent records and an append-only audit trail you can hand to a regulator without preparing anything.', foot: 'DPDP-ready' }
  ];

  const compare = [
    { label: 'TODAY', before: 'Medical forms in a filing cabinet in the admin block', after: 'Records held by the student, linked to ABHA' },
    { label: 'TODAY', before: 'The campus is the data fiduciary for every student record', after: 'The student holds; we process on their instruction' },
    { label: 'TODAY', before: 'A camp report is a spreadsheet someone types up', after: 'Attendance and coverage, generated, with suppression applied' },
    { label: 'TODAY', before: 'An erasure request has nowhere to go', after: 'A statutory queue with the clock on every row' }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '78px', padding: '0 clamp(16px, 4vw, 64px)', display: 'flex', alignItems: 'center', gap: '30px', background: '#FAF8FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#cg1)" />
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
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>For campuses</span>
          <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For clinicians</a>
          <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>Partnerships</a>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/campuses" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: '#4F46E5', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Book a walkthrough
        </a>
      </header>

      {/* 2. Top Banner */}
      <section
        aria-label="For campuses"
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 4vw, 64px) 0',
          minHeight: '240px',
          borderRadius: '28px',
          background: 'linear-gradient(110deg, #EEF2FF 0%, #FFFFFF 45%, #DCFCE7 100%)',
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
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>FOR CAMPUSES</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Care that reaches every block and hostel.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Health camps</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Coverage reports</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>One-term pilot</span>
          </div>
        </div>

        {/* Dynamic Campus Map & Blocks Graphic */}
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'flex-end', minWidth: '300px' }}>
          <svg width="100%" height="200" viewBox="0 0 520 200" fill="none" style={{ maxWidth: '520px' }} aria-hidden="true">
            <rect x="30" y="30" width="100" height="140" rx="8" fill="#4F46E5" />
            <rect x="150" y="70" width="80" height="100" rx="8" fill="#4338CA" />
            <rect x="250" y="20" width="120" height="150" rx="8" fill="#3730A3" />
            <path d="M400 160 C440 100 480 180 510 120" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
            <circle cx="400" cy="160" r="14" fill="#10B981" />
            <circle cx="510" cy="120" r="14" fill="#F59E0B" />
          </svg>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '62px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '60px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>FOR CAMPUS ADMINISTRATORS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.5vw, 58px)', lineHeight: 1.06, fontWeight: 800, color: '#131B2E', letterSpacing: '-2.1px' }}>
            Know your cohort is healthy without knowing who is ill.
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '18px', lineHeight: 1.62, fontWeight: 500, color: '#464555' }}>
            You get attendance, coverage and camp outcomes. You do not get names against findings, and you cannot get them — the suppression is in the query, not the screen.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/campuses" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', padding: '0 30px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See the admin console
            </a>
            <a href="/camp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', padding: '0 26px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #DAE2FD', fontSize: '15px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
              Run a health camp
            </a>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '44px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '18px', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#464555' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. The Boundary In Writing */}
      <section
        style={{
          margin: '76px clamp(16px, 4vw, 64px) 0',
          padding: '52px clamp(20px, 4vw, 58px)',
          borderRadius: '30px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #17144C 100%)',
          display: 'flex',
          gap: '56px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 380px', maxWidth: '470px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.4px' }}>THE BOUNDARY, IN WRITING</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.1px' }}>
            What your dashboard can and cannot show.
          </h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            A cohort under 20 students is suppressed before the result leaves the database. Mental health and sexual health categories are suppressed at every cohort size, however large.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {boundary.map((b, i) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: i < boundary.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: b.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{b.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: b.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: b.on ? '#82F5C1' : '#FCA5A5' }}>
                {b.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Four Jobs Off Your Desk */}
      <section style={{ padding: '80px clamp(16px, 4vw, 64px) 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHAT YOU ACTUALLY RUN</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Four jobs, off your desk.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {jobs.map((j) => (
            <div key={j.title} style={{ minHeight: '250px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '11px', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{j.eyebrow}</span>
              <span style={{ fontSize: '20px', lineHeight: 1.24, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px' }}>{j.title}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>{j.body}</span>
              <span style={{ flexGrow: 1 }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>{j.foot}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Compare Table: Liability */}
      <section style={{ padding: '80px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHY IT MATTERS TO YOU</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 38px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>The liability sits with whoever holds the data.</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#464555' }}>
            Under the DPDP Act, a campus that stores student medical records is a data fiduciary with everything that follows. Here, the student is the record holder and we are the processor. You get the operational picture without the duty.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {compare.map((c) => (
            <div key={c.before} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', padding: '18px 0', borderBottom: '1px solid #EEF2FF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B6980', letterSpacing: '1px' }}>{c.label}</span>
                <span style={{ fontSize: '14.5px', lineHeight: 1.5, fontWeight: 600, color: '#9F1239' }}>{c.before}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', letterSpacing: '1px' }}>WITH STUDENT KARE</span>
                <span style={{ fontSize: '14.5px', lineHeight: 1.5, fontWeight: 600, color: '#131B2E' }}>{c.after}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Start With One Camp */}
      <section
        style={{
          margin: '80px clamp(16px, 4vw, 64px) 0',
          padding: '52px clamp(20px, 4vw, 58px)',
          borderRadius: '30px',
          background: '#EEF2FF',
          display: 'flex',
          alignItems: 'center',
          gap: '48px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>
            Start with one camp.
          </h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Run your next health check through the platform and compare the attendance report against what you get today. No integration needed for the first one.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-end' }}>
          <a href="/campuses" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '58px', padding: '0 34px', borderRadius: '999px', background: '#4F46E5', fontSize: '16px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Book a walkthrough
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>30 minutes · with your registrar if you like</span>
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

      {/* 9. Footer with Newsletter Subscription */}
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
                if (nlInput.trim()) setNlSubscribed(true);
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
          <nav aria-label="For Campuses Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR CAMPUSES</span>
            <a href="/campuses" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Campus console</a>
            <a href="/camp" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Health camps</a>
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
